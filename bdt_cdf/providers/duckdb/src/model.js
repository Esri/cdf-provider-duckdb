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
		this.maxRecordCountPerPage = 10000;
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
		const { resultRecordCount, returnCountOnly } = // TODO: speed up returnIdsOnly with large datasets
			geoserviceParams;
		const fetchSize = resultRecordCount || this.maxRecordCountPerPage;
		const db = await this.#duckdb;

		try {
			const sqlQuery = buildSqlQuery(
				geoserviceParams,
				this.idField,
				this.geometryField,
				this.tableName,
				fetchSize,
			);
			const rows = await db.all(sqlQuery);
			console.log("Data size: " + rows.length);
	
			var geojson = {type: "FeatureCollection", features: []};
			if (rows.length == 0) { 
				return callback(null, geojson);
			} else if (returnCountOnly) { 
				geojson.count = Number(rows[0]["count(1)"]);
			} else {
				geojson = translateToGeoJSON(rows, this.#sourceConfig, this.idField);
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
				//extent?
			};
			callback(null, geojson);
		} catch (error) {
			callback(error);
		}
	}
}

module.exports = Model;
