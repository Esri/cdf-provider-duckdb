const Ajv = require("ajv");
const ajv = new Ajv();

const configSchema = {
	type: "object",
	properties: {
		duckdb: {
			type: "object",
			properties: {
				sources: {
					type: "object",
					properties: {
						datasource: {
							type: "object",
							properties: {
								blobUrl: { type: "string", minLength: 1 },
								azureStorageConnStr: { type: "string", minLength: 1 },
								WKBColumn: { type: "string", minLength: 1 },
								geomOutColumn: { type: "string", minLength: 1 },
								idField: { type: "string", minLength: 1 },
								maxRecordCountPerPage: { type: "integer"},
								properties: {
									type: "object",
									properties: {
										name: { type: "string", minLength: 1 },
										description: { type: "string" },
									},
									required: ["name"],
								},
							},
							required: ["blobUrl", "azureStorageConnStr", "WKBColumn", "geomOutColumn", "idField", "maxRecordCountPerPage", "properties"],
						},
					},
					required: ["datasource"],
				},
			},
			required: ["sources"],
		},
	},
	required: ["duckdb"],
};

function validateConfig(config) {
	const valid = ajv.validate(configSchema, config);
	if (!valid) {
		throw new Error("Invalid config: " + ajv.errorsText());
	}
}

module.exports = {
	validateConfig,
};
