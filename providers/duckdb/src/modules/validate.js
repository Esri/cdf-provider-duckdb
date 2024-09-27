function validateConfig(config) {
	if (config.duckdb.sources.deltaPointsTable) {
		var deltaPointsRequiredFields = [
			"deltaUrl",
			"azureStorageConnStr",
			"WKBColumn",
			"geomOutColumn",
			"idField",
			"maxRecordCountPerPage",
			"properties",
		];
		const allKeysTruthy = deltaPointsRequiredFields.every(
			(key) => config.duckdb.sources.deltaPointsTable[key]
		);
		if (!allKeysTruthy) {
			throw new Error("Error with required key in default.json file");
		}
		return;
	}

	if (config.duckdb.sources.deltaBinsTable) {
		var deltaBinsRequiredFields = [
			"deltaUrl",
			"azureStorageConnStr",
			"WKBColumn",
			"geomOutColumn",
			"idField",
			"maxRecordCountPerPage",
			"properties",
		];
		const allKeysTruthy = deltaBinsRequiredFields.every(
			(key) => config.duckdb.sources.deltaBinsTable[key]
		);
		if (!allKeysTruthy) {
			throw new Error("Error with required key in default.json file");
		}
		return;
	}

	if (config.duckdb.sources.minio) {
		var minioRequiredFields = [
			"s3Url",
			"s3Region",
			"s3AccessKeyId",
			"s3Secret",
			"s3BucketName",
			"WKBColumn",
			"geomOutColumn",
			"idField",
			"maxRecordCountPerPage",
			"properties"
		];
		const allKeysTruthy = minioRequiredFields.every(
			(key) => config.duckdb.sources.minio[key]
		);
		if (!allKeysTruthy) {
			throw new Error("Error with required key in default.json file");
		}
		return;
	}

	if (config.duckdb.sources.localParquet) {
		// TODO: add schema validation here
		return;
	}

	console.warn("Please set a datasource in the default.json file");
	return;
}

module.exports = {
	validateConfig,
};
