const wkx = require("wkx");

function translateToGeoJSON(data, config) {
	const columns = Object.keys(data[0]);

	if (!columns.includes(config.idField)) {
		console.warn(`Specified ID field "${config.idField}" is not found.`);
		//return null;
	}

	return {
		type: "FeatureCollection",
		features: data.map((row) =>
			formatFeature(row, columns, config.idField, config.geomOutColumn)
		),
	};
}

function formatFeature(values, columns, idField, geometryField) {
	let feature = {
		type: "Feature",
		properties: {},
		geometry: {},
	};

	for (let i = 0; i < columns.length; i++) {
		const value = values[columns[i]];

		if (columns[i] == geometryField) {
			var wkbBuffer = values[columns[i]];
			var geometry = wkx.Geometry.parse(wkbBuffer);
			feature.geometry = geometry.toGeoJSON();
		} else {
			if (columns[i] == idField) {
				if (!isValidId(value)) {
					console.warn(`Invalid ID value: ${value}`);
				}
			}
			feature.properties[columns[i]] = value;
		}
	}

	// if (!isValidGeometry(feature.geometry)) {
	// 	// console.warn(
	// 	// 	`Invalid coordinates: ${feature.geometry.coordinates}, setting to [0, 0]`
	// 	// );
	// 	feature.geometry.coordinates = [0, 0];
	// }

	return feature;
}

// Max ID value supported by feature server:
// https://koopjs.github.io/docs/usage/provider#setting-provider-metadata-in-getdata
function isValidId(value) {
	const parsedValue = parseInt(value);
	return 0 <= parsedValue && parsedValue <= 2147483647;
}

function isValidGeometry(geometry) {
	if (!geometry || !geometry.coordinates) {
		return false;
	} else {
		return (
			!Number.isNaN(geometry.coordinates[0]) &&
			!Number.isNaN(geometry.coordinates[1])
		);
	}
}

module.exports = {
	translateToGeoJSON,
};
