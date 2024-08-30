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

	throw new Error("Please set a datasource in the default.json file");
}

module.exports = {
	validateConfig,
};
