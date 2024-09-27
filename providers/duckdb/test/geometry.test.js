/* eslint-env mocha */

// Adopted from standardize-geometry-filter https://github.com/koopjs/geoservice-utils/blob/main/src/standardize-geometry-filter/index.spec.ts

const chai = require("chai");
const expect = chai.expect;
const { getGeometryQuery } = require("../src/modules/geometry");

describe("geometryQuery tests:", function () {
	it("delimited point", function (done) {
		let query = getGeometryQuery("-123, 48", "geometry");
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-123,48]}'))`
		);
		done();
	});

	it("delimited point with options", function (done) {
		let query = getGeometryQuery(
			"-123, 48",
			"geometry",
			"4326",
			"esriSpatialRelIntersects",
			3857
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_TRANSFORM(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-123,48]}'),'EPSG:4326','EPSG:3857',TRUE))`
		);
		done();
	});

	it("delimited bbox", function (done) {
		let query = getGeometryQuery(
			"-123, 48, -122, 49",
			"geometry",
			"4326",
			"esriSpatialRelIntersects",
			3857
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_TRANSFORM(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-123,48],[-122,48],[-122,49],[-123,49],[-123,48]]]}'),'EPSG:4326','EPSG:3857',TRUE))`
		);
		done();
	});

	it("point json", function (done) {
		let query = getGeometryQuery(
			'{"x": -123, "y": 48}',
			"geometry",
			"4326",
			"esriSpatialRelIntersects"
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-123,48]}'))`
		);
		done();
	});

	it("point json with within", function (done) {
		let query = getGeometryQuery(
			'{"x": -123, "y": 48}',
			"geometry",
			"4326",
			"esriSpatialRelWithin"
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Within(geometry, ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-123,48]}'))`
		);
		done();
	});

	it("envelope", function (done) {
		let query = getGeometryQuery(
			'{"xmin": -123, "xmax": -122, "ymin": 48, "ymax": 49}',
			"geometry",
			"4326",
			"esriSpatialRelIntersects"
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-122,49],[-123,49],[-123,48],[-122,48],[-122,49]]]}'))`
		);
		done();
	});

	it("envelope with reproject", function (done) {
		let query = getGeometryQuery(
			'{"xmin": -123, "xmax": -122, "ymin": 48, "ymax": 49}',
			"geometry",
			4326,
			"esriSpatialRelIntersects",
			"3857"
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_TRANSFORM(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-122,49],[-123,49],[-123,48],[-122,48],[-122,49]]]}'),'EPSG:4326','EPSG:3857',TRUE))`
		);
		done();
	});

	it("polyline", function (done) {
		let query = getGeometryQuery(
			'{"paths": [[[1, 4],[-2, 4],[2, 3],[3, 10],[0, 10]]]}',
			"geometry",
			4326,
			"esriSpatialRelIntersects",
			"3857"
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_TRANSFORM(ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[1,4],[-2,4],[2,3],[3,10],[0,10]]}'),'EPSG:4326','EPSG:3857',TRUE))`
		);
		done();
	});

	it("multipolyline", function (done) {
		let query = getGeometryQuery(
			'{"paths": [[ [1, 4],[-2, 4],[2, 3] ], [ [3, 10],[0, 10] ] ]}',
			"geometry",
			4326,
			"esriSpatialRelIntersects",
			"3857"
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_TRANSFORM(ST_GeomFromGeoJSON('{"type":"MultiLineString","coordinates":[[[1,4],[-2,4],[2,3]],[[3,10],[0,10]]]}'),'EPSG:4326','EPSG:3857',TRUE))`
		);
		done();
	});

	it("polygon rings", function (done) {
		let query = getGeometryQuery(
			'{"rings":  [ [ [-134, 610],[-134, 594],[-135, 594],[-135, 610],[-134, 610] ] ]}',
			"geometry",
			4326,
			"esriSpatialRelIntersects",
			"3857"
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_TRANSFORM(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-134,610],[-135,610],[-135,594],[-134,594],[-134,610]]]}'),'EPSG:4326','EPSG:3857',TRUE))`
		);
		done();
	});
});
