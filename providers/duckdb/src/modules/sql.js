const { getGeometryQuery } = require("./geometry");

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
		returnDistinctValues,
		returnGeometry,
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
	} else if (returnDistinctValues && !returnGeometry) {
		selectClause = `${outFields}`;
	} else if (outFields === "*") {
		selectClause = `${outFields} EXCLUDE ${geometryField}, ST_AsGeoJSON(${geometryField}) AS ${geometryField}`;
	} else {
		var outputFields = outFields;
		if (!outFields.includes(idField)) {
			// Koop needs OBJECTID field in geojson
			outputFields = outFields.concat(`, ${idField}`);
		}
		selectClause = `${outputFields}, ST_AsGeoJSON(${geometryField}) AS ${geometryField}`;
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

	const distinctClause = returnDistinctValues ? `DISTINCT ` : "";

	const limitClause = fetchSize && !returnIdsOnly && !returnDistinctValues ? ` LIMIT ${fetchSize}` : "";

	const offsetClause =
		resultOffset && !returnIdsOnly ? ` OFFSET ${resultOffset}` : "";

	return `SELECT ${distinctClause}${selectClause}${from}${whereClause}${orderByClause}${limitClause}${offsetClause}`;
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
		var geomComponent = getGeometryQuery(geometry, geometryField, inSR, spatialRel);
		sqlWhereComponents.push(geomComponent);
	}

	return " WHERE " + sqlWhereComponents.join(" AND ");
}

module.exports = {
	buildSqlQuery,
};
