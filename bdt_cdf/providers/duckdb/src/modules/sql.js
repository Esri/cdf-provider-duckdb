const { standardizeGeometryFilter } = require("@koopjs/geoservice-utils");

// TODO: support datetime queries?
function buildSqlQuery(
	geoParams,
	idField,
	geometryField,
	tableName,
	fetchSize
) {
	const {
		where,
		outFields = "*",
		orderByFields,
		objectIds,
		geometry,
		inSR,
		resultOffset,
		spatialRel,
		returnIdsOnly,
		returnCountOnly,
	} = geoParams;

	// only return back one row for metadata purposes
	var isMetadataRequest =
		Object.keys(geoParams).length == 1 && geoParams.hasOwnProperty("f");

	if (isMetadataRequest) {
		fetchSize = 1;
	}

	let selectClause = "";
	if (returnCountOnly) {
		selectClause = "COUNT(1)";
	} else if (returnIdsOnly) {
		selectClause = `${idField}`;
	} else if (outFields === "*") {
		selectClause = `${outFields} EXCLUDE ${geometryField}, ST_AsWKB(${geometryField}) AS ${geometryField}`;
	} else {
		var outputFields = outFields;
		if (!outFields.includes(idField)) {
			// Koop needs OBJECTID field in geojson
			outputFields = outFields.concat(`, ${idField}`);
		}
		selectClause = `${outputFields}, ST_AsWKB(${geometryField}) AS ${geometryField}`;
	}

	const from = ` FROM ${tableName}`;

	const whereClause = buildSqlWhere({
		where,
		objectIds,
		idField,
		geometry,
		geometryField,
		inSR,
		spatialRel,
	});

	const orderByClause = orderByFields ? ` ORDER BY ${orderByFields}` : "";

	const limitClause = fetchSize && !returnIdsOnly ? ` LIMIT ${fetchSize}` : "";

	const offsetClause =
		resultOffset && !returnIdsOnly ? ` OFFSET ${resultOffset}` : "";

	return `SELECT ${selectClause}${from}${whereClause}${orderByClause}${limitClause}${offsetClause}`;
}

function buildSqlWhere({
	where,
	objectIds,
	idField,
	geometry,
	geometryField,
	inSR,
	spatialRel,
}) {
	const sqlWhereComponents = [];

	if (!where && objectIds === undefined) {
		return "";
	}

	if (where) {
		sqlWhereComponents.push(where);
	}

	if (idField && objectIds) {
		const objectIdsComponent = objectIds
			.split(",")
			.map((val) => {
				return isNaN(val) ? `'${val}'` : val;
			})
			.join(",")
			.replace(/^/, `${idField} IN (`)
			.replace(/$/, ")");

		sqlWhereComponents.push(objectIdsComponent);
	}

	if (geometry && geometryField) {
		if (typeof inSR === "string") {
			inSR = parseInt(inSR);
		}

		const { geometry: geometryFilter, relation } = standardizeGeometryFilter({
			geometry,
			inSR,
			reprojectionSR: 4326,
			spatialRel,
		});

		let geomComponent = "";
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
		sqlWhereComponents.push(geomComponent);
	}

	return " WHERE " + sqlWhereComponents.join(" AND ");
}

module.exports = {
	buildSqlQuery,
};
