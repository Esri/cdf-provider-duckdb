const koopConfig = require("config");
require('dotenv').config();
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
		this.#duckdb = initDuckDb(this.#sourceConfig);

		async function initDuckDb(sourceConfig) {
			// await downloadFromAzure(sourceConfig.blobUrl, sourceConfig.fileName);
			const db = await Database.create(":memory:");
			await db.run(`INSTALL spatial; LOAD spatial; 
						INSTALL delta;LOAD delta;
						INSTALL azure;LOAD azure;
						CREATE SECRET secret1 (TYPE AZURE, CONNECTION_STRING 'az://${process.env.AZURE_CONN_STR}');`);
			await db.run(`
        		CREATE TABLE ${sourceConfig.properties.name} AS 
        		SELECT * EXCLUDE ${sourceConfig.WKBColumn}, 
        		ST_GeomFromWKB(${sourceConfig.WKBColumn}) AS ${sourceConfig.geomOutColumn}, 
        		CAST(row_number() OVER () AS INTEGER) AS ${sourceConfig.idField}
        		FROM read_parquet('${sourceConfig.blobUrl}', hive_partitioning = true)`);
			console.log("DuckDB initialized");
			return db;
		}
	}

	async getData(req, callback) {
		const { query: geoserviceParams } = req;
		const { resultRecordCount, returnCountOnly } = // TODO: speed up returnIdsOnly with large datasets
			geoserviceParams;
		const fetchSize = resultRecordCount || this.#sourceConfig.maxRecordCountPerPage;
		const db = await this.#duckdb;

		try {
			const sqlQuery = buildSqlQuery(
				geoserviceParams,
				this.#sourceConfig.idField,
				this.#sourceConfig.geomOutColumn,
				this.#sourceConfig.properties.name,
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
				geojson = translateToGeoJSON(rows, this.#sourceConfig);
			}

			geojson.filtersApplied = generateFiltersApplied(
				geoserviceParams,
				this.#sourceConfig.idField,
				this.#sourceConfig.geomOutColumn,
			);

			geojson.metadata = {
				...this.#sourceConfig.properties,
				maxRecordCount: this.#sourceConfig.maxRecordCountPerPage,
				idField: this.#sourceConfig.idField,
				//extent?
			};
			callback(null, geojson);
		} catch (error) {
			callback(error);
		}
	}
}

module.exports = Model;
