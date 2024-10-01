const { arcgisToGeoJSON } = require("./terraformer");

function getGeometryQuery(
	geometry,
	geometryField,
	inSR = 4326,
	spatialRel = "esriSpatialRelIntersects",
	dbSR = 4326
) {
	var rawGeomFilter = "";
	try {
		rawGeomFilter = JSON.parse(geometry);
	} catch (error) {
		rawGeomFilter = geometry.split(",").map((item) => Number(item.trim()));
	}
	var geometryFilter = `ST_GeomFromGeoJSON('${toGeoJsonString(rawGeomFilter)}')`;
	if (inSR != dbSR) {
		geometryFilter = `ST_TRANSFORM(${geometryFilter},'EPSG:${inSR}','EPSG:${dbSR}',TRUE)`;
	}

	var geomComponent = "";
	switch (spatialRel) {
		case "esriSpatialRelIntersects":
			geomComponent = `ST_Intersects_Extent(${geometryField}, ${geometryFilter})`;
			break;
		case "esriSpatialRelContains":
			geomComponent = `ST_Contains(${geometryField}, ${geometryFilter})`;
			break;
		case "esriSpatialRelWithin":
			geomComponent = `ST_Within(${geometryField}, ${geometryFilter})`;
			break;
		case "esriSpatialRelCrosses":
			geomComponent = `ST_Crosses(${geometryField}, ${geometryFilter})`;
			break;
		case "esriSpatialRelOverlaps":
			geomComponent = `ST_Overlaps(${geometryField}, ${geometryFilter})`;
			break;
		case "esriSpatialRelTouches":
			geomComponent = `ST_Touches(${geometryField}, ${geometryFilter})`;
			break;
		default:
			throw new Error(`Unsupported spatial relation: ${spatialRel}`);
	}
	return geomComponent;
}

function toGeoJsonString(filter) {
	var geojson = {};
	if (isSinglePointArray(filter)) {
		geojson = {
			type: "Point",
			coordinates: filter.map(Number),
		};
	} else if (isEnvelopeArray(filter)) {
		geojson = {
			type: "Polygon",
			coordinates: [
				[
					[filter[0], filter[1]], // Bottom-left corner
					[filter[2], filter[1]], // Bottom-right corner
					[filter[2], filter[3]], // Top-right corner
					[filter[0], filter[3]], // Top-left corner
					[filter[0], filter[1]], // Closing the polygon
				],
			],
		};
	} else {
        // terraformer conversion function 
		geojson = arcgisToGeoJSON(filter);
	}
	return JSON.stringify(geojson);
}

function isSinglePointArray(pointArray) {
	if (!Array.isArray(pointArray)) {
		return false;
	}
	if (pointArray.length !== 2) {
		return false;
	}
	return pointArray.every((item) => typeof item === "number");
}

function isEnvelopeArray(envelopeArray) {
	if (!Array.isArray(envelopeArray)) {
		return false;
	}
	if (envelopeArray.length !== 4) {
		return false;
	}
	return envelopeArray.every((item) => typeof item === "number");
}

function geojsonToBbox(geoJsonPolygon) {
    const coordinates = geoJsonPolygon.coordinates[0];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    coordinates.forEach(([longitude, latitude]) => {
        if (longitude < minX) minX = longitude;
        if (longitude > maxX) maxX = longitude;
        if (latitude < minY) minY = latitude;
        if (latitude > maxY) maxY = latitude;
    });
    return [minX, minY, maxX, maxY];
}

module.exports = {
	getGeometryQuery,
	geojsonToBbox
};
