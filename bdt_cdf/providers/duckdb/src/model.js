const koopConfig = require("config");
const { Database } = require("duckdb-async");
const {
	translateToGeoJSON,
	validateConfig,
	downloadFromAzure,
	buildSqlQuery,
	generateFiltersApplied,
} = require("./modules");

class Model {
	#duckdb;
	#sourceConfig;

	constructor(koop) {
		try {
			validateConfig(koopConfig);
		} catch (error) {
			throw error;
		}
		this.#sourceConfig = koopConfig.duckdb.sources.datasource;
		this.idField = "OBJECTID";
		this.maxRecordCountPerPage = 25000;
		this.geometryField = this.#sourceConfig.geomOutColumn;
		this.tableName = this.#sourceConfig.properties.name;
		this.#duckdb = initDuckDb(this.#sourceConfig, this.idField);

		async function initDuckDb(sourceConfig, idField) {
			// TODO: make sure this works with a single parquet file as well
			// TODO: support multiple cloud providers and reading directly instead of to disk
			await downloadFromAzure(sourceConfig.blobUrl, sourceConfig.fileName);
			const db = await Database.create(":memory:");
			await db.run(`INSTALL spatial; LOAD spatial`);
			await db.run(`
        		CREATE TABLE ${sourceConfig.properties.name} AS 
        		SELECT * EXCLUDE ${sourceConfig.WKBColumn}, 
        		ST_GeomFromWKB(${sourceConfig.WKBColumn}) AS ${sourceConfig.geomOutColumn}, 
        		CAST(row_number() OVER () AS INTEGER) AS ${idField}
        		FROM read_parquet('${sourceConfig.fileName}/*.parquet', hive_partitioning = true)`);
			console.log("DuckDB initialized");
			return db;
		}
	}

	async getData(req, callback) {
		const { query: geoserviceParams } = req;
		const { resultRecordCount, returnCountOnly, returnIdsOnly } =
			geoserviceParams;
		const fetchSize = resultRecordCount || this.maxRecordCountPerPage;
		const db = await this.#duckdb;
		const con = await db.connect();

		try {
			// only return back one row for metadata purposes
			let isMetadataRequest =
				Object.keys(geoserviceParams).length == 1 &&
				geoserviceParams.hasOwnProperty("f");
			// only return back the entire DB as object ids with no limits
			let isOnlyIdRequest = returnCountOnly || returnIdsOnly;

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
				geojson = translateToGeoJSON(rows, this.#sourceConfig, this.idField);
				console.timeEnd("translate");
			}

			geojson.filtersApplied = generateFiltersApplied(
				geoserviceParams,
				this.idField,
				this.geometryField
			);

			geojson.metadata = {
				...this.#sourceConfig?.properties,
				maxRecordCount: this.maxRecordCountPerPage,
				idField: this.idField,
				limitExceeded: 1000000 > rows.length,
				//extent?
			};
			callback(null, geojson);
		} catch (error) {
			callback(error);
		}
	}
}

module.exports = Model;
