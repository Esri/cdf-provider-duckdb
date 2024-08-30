const koopConfig = require("config");
const duckdb = require("duckdb");
const {
	translateToGeoJSON,
	validateConfig,
	buildSqlQuery,
	generateFiltersApplied,
} = require("./modules");

class Model {
	constructor(koop) {
		try {
			validateConfig(koopConfig);
		} catch (error) {
			throw error;
		}
		this.db = new duckdb.Database(":memory:");
		const deltaPointsConfig = koopConfig.duckdb.sources.deltaPointsTable;
		const deltaBinsConfig = koopConfig.duckdb.sources.deltaBinsTable;

		var deltaPointsCreateClause = ``;
		if (deltaPointsConfig) {
			var secretClause = `CREATE SECRET deltatableconn (TYPE AZURE, CONNECTION_STRING 'abfss://${deltaPointsConfig.azureStorageConnStr}');`;
			deltaPointsCreateClause = `${secretClause}
						CREATE TABLE ${deltaPointsConfig.properties.name} AS 
						SELECT * EXCLUDE ${deltaPointsConfig.WKBColumn}, 
						ST_GeomFromWKB(CAST(${deltaPointsConfig.WKBColumn} AS BLOB)) AS ${deltaPointsConfig.geomOutColumn}, 
						CAST(row_number() OVER () AS INTEGER) AS ${deltaPointsConfig.idField}
						FROM delta_scan('${deltaPointsConfig.deltaUrl}');`;
		}

		var deltaBinsCreateClause = ``;
		if (deltaBinsConfig) {
			var secretClause = `CREATE SECRET deltabinsconn (TYPE AZURE, CONNECTION_STRING 'abfss://${deltaBinsConfig.azureStorageConnStr}');`;
			deltaBinsCreateClause = `${secretClause}
						CREATE TABLE ${deltaBinsConfig.properties.name} AS 
						SELECT * EXCLUDE ${deltaBinsConfig.WKBColumn}, 
						ST_GeomFromWKB(CAST(${deltaBinsConfig.WKBColumn} AS BLOB)) AS ${deltaBinsConfig.geomOutColumn}, 
						CAST(row_number() OVER () AS INTEGER) AS ${deltaBinsConfig.idField}
						FROM delta_scan('${deltaBinsConfig.deltaUrl}');`;
		}

		const initQuery = `INSTALL spatial; LOAD spatial; 
						INSTALL delta;LOAD delta;
						INSTALL azure;LOAD azure;
						${deltaPointsCreateClause};
						${deltaBinsCreateClause};`;
		this.db.all(initQuery, function (err, res) {
			if (err) {
				console.warn(err);
				return;
			}
			console.log(res[0]);
			console.log("🦆 DuckDB initialized 🦆");
		});
	}

	async getData(req, callback) {
		const { query: geoserviceParams } = req;
		const {
			resultRecordCount,
			returnCountOnly,
		} = // TODO: speed up returnIdsOnly with large datasets
			geoserviceParams;
		const config = koopConfig["duckdb"];
		const sourceId = req.params.id;
		const sourceConfig = config.sources[sourceId];
		const fetchSize = resultRecordCount || sourceConfig.maxRecordCountPerPage;

		try {
			const sqlQuery = buildSqlQuery(
				geoserviceParams,
				sourceConfig.idField,
				sourceConfig.geomOutColumn,
				sourceConfig.properties.name,
				fetchSize
			);
			const rows = await queryWithCallback(this.db, sqlQuery);
			console.log("Data size: " + rows.length);

			var geojson = { type: "FeatureCollection", features: [] };
			if (rows.length == 0) {
				return callback(null, geojson);
			} else if (returnCountOnly) {
				geojson.count = Number(rows[0]["count(1)"]);
			} else {
				geojson = translateToGeoJSON(rows, sourceConfig);
			}

			geojson.filtersApplied = generateFiltersApplied(
				geoserviceParams,
				sourceConfig.idField,
				sourceConfig.geomOutColumn
			);

			geojson.metadata = {
				...sourceConfig.properties,
				maxRecordCount: sourceConfig.maxRecordCountPerPage,
				idField: sourceConfig.idField,
				//extent?
			};
			callback(null, geojson);
		} catch (error) {
			callback(error);
		}
	}
}

function queryWithCallback(conn, sql) {
	return new Promise((resolve, reject) => {
		conn.all(sql, (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

module.exports = Model;
