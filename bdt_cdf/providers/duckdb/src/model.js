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
    console.log("Downloading data and creating duckDB");
    // TODO: function to verify config params and throw error if any are null 
    const config = koopConfig?.duckdb;
    const sourceConfig = config.sources?.datasource;
    this.#sourceConfig = sourceConfig;
    this.#duckdb = initDuckDb(sourceConfig);

    async function initDuckDb(sourceConfig) {
      // TODO: make sure this works with a single parquet file as well 
      // TODO: support multiple cloud providers and reading directly instead of to disk
      await downloadFromAzure(sourceConfig?.blobUrl, sourceConfig?.fileName); // TODO: error checks in this 
      const db = await Database.create(":memory:");
      await db.run(`INSTALL spatial; LOAD spatial`);
      await db.run(`
        CREATE TABLE ${sourceConfig?.properties?.name} AS 
        SELECT * EXCLUDE ${sourceConfig?.WKBColumn}, ST_GeomFromWKB(${sourceConfig?.WKBColumn}) AS ${sourceConfig?.geomOutColumn}
        FROM read_parquet('${sourceConfig?.fileName}/*.parquet', hive_partitioning = true)`
      );
      return db;
    }
  }

  async getData (req, callback) {
    const {
      query: geoserviceParams,
    } = req;
    const { resultRecordCount } = geoserviceParams;
    const maxRecords = resultRecordCount || 2000; 
    const tableName = this.#sourceConfig?.properties?.name;
    const idField = this.#sourceConfig?.properties?.idField;
    const geometryField = this.#sourceConfig?.geomOutColumn;
    const db = await this.#duckdb;
    const con = await db.connect();

    try { // TODO: support datetime queries? 
      const sqlQuery = buildSqlQuery({
        ...geoserviceParams,
        idField,
        geometryField,
        tableName,
        maxRecords,
      });

      console.time("query");
      const rows = await con.all(sqlQuery);
      console.timeEnd("query");

      console.log("Data size: " + rows.length);
      if (rows.length == 0) {
        return callback(null, { type: "FeatureCollection", features: [] });
      }

      console.time("translate");
      const geojson = translate(rows, this.#sourceConfig);
      console.timeEnd("translate");

      geojson.filtersApplied = generateFiltersApplied({
        ...geoserviceParams,
        idField,
        geometryField,
        maxRecords,
      });

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

function buildSqlQuery(params) {
  const {
    where,
    outFields = '*',
    orderByFields,
    objectIds,
    geometryField,
    tableName,
    idField,
    maxRecords,
    geometry,
    inSR, 
    resultOffset,
    spatialRel
  } = params;

  const from = ` FROM ${tableName}`;

  let selectFields = '';
  if (outFields === '*') {
    selectFields = `${outFields} EXCLUDE ${geometryField}, ST_AsGeoJSON(${geometryField}) AS ${geometryField}`;
  } else {
    selectFields = `${outFields}, ST_AsGeoJSON(${geometryField}) AS ${geometryField}`;
  }

  const whereClause = buildSqlWhere({ where, objectIds, idField, geometry, geometryField, inSR, spatialRel });

  const orderByClause = orderByFields ? ` ORDER BY ${orderByFields}` : '';

  const limitClause = maxRecords ? ` LIMIT ${maxRecords}` : '';

  const offsetClause = resultOffset ? ` OFFSET ${resultOffset}` : '';

  return `SELECT ${selectFields}${from}${whereClause}${orderByClause}${limitClause}${offsetClause}`;   
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

function generateFiltersApplied({ where, objectIds, orderByFields, resultOffset, idField, geometry, geometryField, maxRecords }) {
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

  if (maxRecords) {
    filtersApplied.limit = true;
  }

  return filtersApplied;
}

module.exports = Model
