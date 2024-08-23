const koopConfig = require("config");
const { Database } = require("duckdb-async");
const {
	translateToGeoJSON,
	validateConfig,
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
			const db = await Database.create(":memory:");
			await db.run(`INSTALL spatial; LOAD spatial; 
						INSTALL delta;LOAD delta;
						INSTALL azure;LOAD azure;`);

			var fromClause = ""; 
			if (sourceConfig.deltaUrl){
				fromClause = `FROM delta_scan('${sourceConfig.deltaUrl}')`
				await db.run(`CREATE SECRET azure_conn (TYPE AZURE, CONNECTION_STRING 'abfss://${sourceConfig.azureStorageConnStr}');`);
			} else if (sourceConfig.blobUrl) {
				fromClause = `FROM read_parquet('${sourceConfig.blobUrl}', hive_partitioning = true)`;
				await db.run(`CREATE SECRET azure_conn (TYPE AZURE, CONNECTION_STRING 'az://${sourceConfig.azureStorageConnStr}');`);
			}
			else {
				throw new Error("Please set a delta/parquet url in the default.json file");
			}
			
			await db.run(`
        		CREATE TABLE ${sourceConfig.properties.name} AS 
        		SELECT * EXCLUDE ${sourceConfig.WKBColumn}, 
        		ST_GeomFromWKB(${sourceConfig.WKBColumn}) AS ${sourceConfig.geomOutColumn}, 
        		CAST(row_number() OVER () AS INTEGER) AS ${sourceConfig.idField}
				${fromClause}`);
			console.log("🦆 DuckDB initialized 🦆");
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
