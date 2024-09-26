const { standardizeGeometryFilter } = require("@koopjs/geoservice-utils");

function getGeometryQuery(geometry, geometryField, inSR, spatialRel, outSR = 4326) {
	if (typeof inSR === "string") {
		inSR = parseInt(inSR);
	}
	if (typeof outSR === "string") {
		outSR = parseInt(outSR);
	}

    const { geometry: geometryFilter, relation } = standardizeGeometryFilter({
		geometry,
		inSR,
		reprojectionSR: 4326,
		spatialRel,
	});

    // var geometryFilter = "";
    // try {
    //     geometryFilter = JSON.parse(geometry);
    //   } catch (error) {
    //     geometryFilter = geometry.split(',').map((item) => Number(item.trim()));
    // }
    // var relation = spatialRel || "esriSpatialRelIntersects";

    // parse geometry into geojson string
  
    // if (inSR != outSR){
    //     geometryFilter = `ST_TRANSFORM(${geometryFilter},'EPSG:${inSR}','EPSG:${outSR}',TRUE)`
    // }

	var geomComponent = "";
	switch (relation) {
		case "esriSpatialRelIntersects":
			geomComponent = `ST_Intersects_Extent(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(
				geometryFilter
			)}'))`;
			break;
		case "esriSpatialRelContains":
			geomComponent = `ST_Contains(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(
				geometryFilter
			)}'))`;
			break;
		case "esriSpatialRelWithin":
			geomComponent = `ST_Within(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(
				geometryFilter
			)}'))`;
			break;
		case "esriSpatialRelCrosses":
			geomComponent = `ST_Crosses(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(
				geometryFilter
			)}'))`;
			break;
		case "esriSpatialRelOverlaps":
			geomComponent = `ST_Overlaps(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(
				geometryFilter
			)}'))`;
			break;
		case "esriSpatialRelTouches":
			geomComponent = `ST_Touches(${geometryField}, ST_GeomFromGeoJSON('${JSON.stringify(
				geometryFilter
			)}'))`;
			break;
		default:
			throw new Error(`Unsupported spatial relation: ${relation}`);
	}
    return geomComponent;
}

module.exports = {
	getGeometryQuery,
};
