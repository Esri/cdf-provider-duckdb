const koopConfig = require("config");
const fs = require('fs');
const translate = require("./utils/translate");
const { standardizeGeometryFilter } = require('@koopjs/geoservice-utils');
const { Database } = require("duckdb-async");
const { ContainerClient } = require("@azure/storage-blob");

class Model {
  #duckdb;
  #sourceConfig;

  constructor(koop) {
    this.#sourceConfig = koopConfig?.duckdb?.sources?.datasource;
    this.idField = "OBJECTID";
    this.maxRecordCountPerPage = 10000;
    this.geometryField = this.#sourceConfig?.geomOutColumn;
    this.tableName = this.#sourceConfig?.properties?.name;

    this.#duckdb = initDuckDb(this.#sourceConfig, this.idField);
    console.log("DuckDB initialized");

    async function initDuckDb(sourceConfig, idField) {
      // TODO: make sure this works with a single parquet file as well 
      // TODO: support multiple cloud providers and reading directly instead of to disk
      // TODO: change objectid to big int to support > MAX_INT dataset sizes?  
      // TODO: error handling in downloadfromazure
      // TODO: function to verify config params and throw error if any are null 
      await downloadFromAzure(sourceConfig?.blobUrl, sourceConfig?.fileName); 
      const db = await Database.create(":memory:");
      await db.run(`INSTALL spatial; LOAD spatial`);
      await db.run(`
        CREATE TABLE ${sourceConfig?.properties?.name} AS 
        SELECT * EXCLUDE ${sourceConfig?.WKBColumn}, 
        ST_GeomFromWKB(${sourceConfig?.WKBColumn}) AS ${sourceConfig?.geomOutColumn}, 
        CAST(row_number() OVER () AS INTEGER) AS ${idField}
        FROM read_parquet('${sourceConfig?.fileName}/*.parquet', hive_partitioning = true)`
      ); 
      return db
    }
  }

  async getData (req, callback) {
    const {
      query: geoserviceParams,
    } = req;
    const { resultRecordCount, returnCountOnly, returnIdsOnly } = geoserviceParams;
    const fetchSize = resultRecordCount || this.maxRecordCountPerPage; 
    const db = await this.#duckdb;
    const con = await db.connect();

    // TODO: support datetime queries?
    try {  
      // only return back one row for metadata purposes
      let isMetadataRequest = (Object.keys(geoserviceParams).length == 1 && geoserviceParams.hasOwnProperty("f")); 
      // only return back the entire DB as object ids with no limits   
      let isOnlyIdRequest = (returnCountOnly || returnIdsOnly); 

      const sqlQuery = buildSqlQuery(
        geoserviceParams,
        this.idField,
        this.geometryField,
        this.tableName,
        fetchSize,
        isMetadataRequest,
        isOnlyIdRequest
      );
      const rows = await con.all(sqlQuery);
    
      console.log("Data size: " + rows.length);
      // TODO: improve this check
      if (rows.length == 0) { 
        return callback(null, { type: "FeatureCollection", features: [] });
      }

      var geojson = {};
      if (isOnlyIdRequest) {
        geojson = rows;
        geojson.count = rows.length;
      } else { 
        console.time("translate");
        geojson = translate(rows, this.#sourceConfig, this.idField);
        console.timeEnd("translate");
      }

      geojson.filtersApplied = generateFiltersApplied(
        geoserviceParams,
        this.idField,
        this.geometryField,
      );

      geojson.metadata = ({
        ...this.#sourceConfig?.properties,
        maxRecordCount: this.maxRecordCountPerPage,
        idField: this.idField,
        limitExceeded: 1000000 > rows.length,
        //extent?
      }) 
      callback(null, geojson);

    } catch (error) {
      callback(error);
    }
  }
}

async function downloadFromAzure(containerUrl, fileName) {
  const containerClient = new ContainerClient(containerUrl);

  let folderFiles = await containerClient.listBlobsByHierarchy("/", { prefix: fileName + "/" });
  if (folderFiles.length == 0) {
    console.log("Its not a folder, downloading the file");
    let blobClient = containerClient.getBlobClient(fileName);
    blobClient.downloadToFile(fileName);
  }
  else { 
    console.log("Its a folder, downloading the files");
    if (!fs.existsSync(fileName)) {
      await fs.promises.mkdir(fileName);
      for await (const blob of folderFiles) {
        if (blob.kind !== "prefix") {
          let blobClient = containerClient.getBlobClient(blob.name);
          await blobClient.downloadToFile("./" + blob.name)
        }
      }
    }
  }
}

function buildSqlQuery(geoParams, idField, geometryField, tableName, fetchSize, isMetadataRequest, isOnlyIdRequest) {
  const {
    where,
    outFields = '*',
    orderByFields,
    objectIds,
    geometry,
    inSR, 
    resultOffset,
    spatialRel
  } = geoParams;

  let selectClause = '';
  if (isOnlyIdRequest) {
    selectClause = `${idField}`;
  }
  else if (outFields === '*') {
    selectClause = `${outFields} EXCLUDE ${geometryField}, ST_AsGeoJSON(${geometryField}) AS ${geometryField}`
  }
  else {
    selectClause = `${outFields}, ST_AsGeoJSON(${geometryField}) AS ${geometryField}`
  }

  if (isMetadataRequest) { 
    fetchSize = 1;
  }

  const from = ` FROM ${tableName}`;

  const whereClause = buildSqlWhere({ where, objectIds, idField, geometry, geometryField, inSR, spatialRel });

  const orderByClause = orderByFields ? ` ORDER BY ${orderByFields}` : '';

  const limitClause = fetchSize && !isOnlyIdRequest ? ` LIMIT ${fetchSize}` : '';

  const offsetClause = resultOffset && !isOnlyIdRequest ? ` OFFSET ${resultOffset}` : '';

  return `SELECT ${selectClause}${from}${whereClause}${orderByClause}${limitClause}${offsetClause}`;   
}

function buildSqlWhere({ where, objectIds, idField, geometry, geometryField, inSR, spatialRel }) {
  const sqlWhereComponents = [];

  if (!where && objectIds === undefined) {
    return '';
  }

  if (where) {
    sqlWhereComponents.push(where);
  }

  if (idField && objectIds) {
    const objectIdsComponent = objectIds
      .split(',')
      .map((val) => {
        return isNaN(val) ? `'${val}'` : val;
      })
      .join(',')
      .replace(/^/, `${idField} IN (`)
      .replace(/$/, ')');

    sqlWhereComponents.push(objectIdsComponent);
  }

  if (geometry && geometryField){

    if (typeof inSR === "string") {
      inSR = parseInt(inSR);
    }

    const { geometry: geometryFilter, relation } = standardizeGeometryFilter({
      geometry,
      inSR,
      reprojectionSR: 4326,
      spatialRel,
    });

    let geomComponent = '';
    switch(relation) {
      case "esriSpatialRelIntersects":
        geomComponent = `ST_Intersects_Extent(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(geometryFilter)}'))`;
        break;
      case "esriSpatialRelContains":
        geomComponent = `ST_Contains(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(geometryFilter)}'))`;
        break;
      case "esriSpatialRelWithin":
        geomComponent = `ST_Within(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(geometryFilter)}'))`;
        break; 
      case "esriSpatialRelCrosses":
        geomComponent = `ST_Crosses(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(geometryFilter)}'))`;
        break; 
      case "esriSpatialRelOverlaps":
        geomComponent = `ST_Overlaps(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(geometryFilter)}'))`;
        break;
      case "esriSpatialRelTouches":
        geomComponent = `ST_Touches(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(geometryFilter)}'))`;
        break; 
      default:
        throw new Error(`Unsupported spatial relation: ${relation}`);         
    }
    sqlWhereComponents.push(geomComponent);
  }

  return ' WHERE ' + sqlWhereComponents.join(' AND ');
}

function generateFiltersApplied(geoParams, idField, geometryField) {
  const { 
    where, 
    objectIds, 
    orderByFields, 
    resultOffset, 
    geometry, 
    resultRecordCount 
  } = geoParams;

  const filtersApplied = {};

  if (where) {
    filtersApplied.where = true;
  }

  if (objectIds && idField) {
    filtersApplied.objectIds = true;
  }

  if (resultOffset) {
    filtersApplied.offset = true;
  }

  if (orderByFields) {
    filtersApplied.orderByFields = true;
  }

  if (geometry && geometryField) {
    filtersApplied.geometry = true;
  }

  if (resultRecordCount) {
    filtersApplied.limit = true;
  }

  return filtersApplied;
}

module.exports = Model
