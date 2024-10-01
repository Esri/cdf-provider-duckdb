function generateFiltersApplied(geoParams, idField, geometryField, dbWKID) {
	const {
		where,
		objectIds,
		orderByFields,
		resultOffset,
		geometry,
		resultRecordCount,
		returnDistinctValues, 
		outSR
	} = geoParams;

	const filtersApplied = {};

	// don't apply filters if asking for unique values of a column
	if (returnDistinctValues) {  
		return filtersApplied;
	}

	if (outSR == dbWKID) {
		filtersApplied.projection = true;
	}

	if (where) {
		filtersApplied.where = true;
	}

	if (objectIds && idField) {
		filtersApplied.objectIds = true;
	}

	if (resultOffset) {
		filtersApplied.offset = true;
	}

	if (orderByFields) {
		filtersApplied.orderByFields = true;
	}

	if (geometry && geometryField) {
		filtersApplied.geometry = true;
	}

	if (resultRecordCount) {
		filtersApplied.limit = true;
	}

	return filtersApplied;
}

module.exports = {
	generateFiltersApplied,
};
