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
		const minioConfig = koopConfig.duckdb.sources.minio;

		var minioCreateClause = ``;
		if (minioConfig) {
			var secretClause = `INSTALL 'httpfs';
								LOAD 'httpfs';
								SET s3_region='${minioConfig.s3Region}';
								SET s3_url_style='path';
								SET s3_endpoint='${minioConfig.s3Url}';
								SET s3_access_key_id='${minioConfig.s3AccessKeyId}';
								SET s3_secret_access_key='${minioConfig.s3Secret}';
								SET s3_use_ssl = false;`;
			minioCreateClause = `${secretClause}
						CREATE TABLE ${minioConfig.properties.name} AS 
						SELECT * EXCLUDE ${minioConfig.WKBColumn}, 
						ST_GeomFromWKB(CAST(${minioConfig.WKBColumn} AS BLOB)) AS ${minioConfig.geomOutColumn}, 
						CAST(row_number() OVER () AS INTEGER) AS ${minioConfig.idField}
						FROM read_parquet('s3://${minioConfig.s3BucketName}/${minioConfig.properties.name}.parquet/*.parquet', hive_partitioning = true);`;
		}

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
						${deltaBinsCreateClause};
						${minioCreateClause};`;
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
		// convert bools from strings 
		Object.keys(req.query).forEach(key => {
			if(req.query[key]+''.toLowerCase() === 'true') req.query[key] = true;
			else if(req.query[key]+''.toLowerCase() === 'false') req.query[key] = false;
		});
		const {query: geoserviceParams} = req;
		const {
			resultRecordCount,
			returnCountOnly, 
			returnDistinctValues, 
			returnGeometry
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

			if (!returnDistinctValues) {
				geojson.filtersApplied = generateFiltersApplied(
					geoserviceParams,
					sourceConfig.idField,
					sourceConfig.geomOutColumn
				);
			}

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
