/* Copyright 2025 Esri

Licensed under the Apache License Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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

	it("delimited point with empty inSR", function (done) {
		let query = getGeometryQuery(
			"-123, 48",
			"geometry",
			"",
			"esriSpatialRelIntersects",
			3857
		);
		console.log(query);
		expect(query).to.not.equal(null);
		expect(query).to.equal(
			`ST_Intersects_Extent(geometry, ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-123,48]}'))`
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

	it("envelope with wkt", function (done) {
		const query = () => {
			return getGeometryQuery(
				'{"xmin": -123, "xmax": -122, "ymin": 48, "ymax": 49, "spatialReference": {"wkt": "GEOGCS[\\"GCS_WGS_1984\\",DATUM[\\"D_WGS_1984\\",SPHEROID[\\"WGS_1984\\",6378137.0,298.257223563]],PRIMEM[\\"Greenwich\\",0.0],UNIT[\\"Degree\\",0.0174532925199433]]"}}',
				"geometry",
				"",
				"esriSpatialRelIntersects"
			);
		};
		expect(query).to.throw(Error, "WKT string parsing not supported");
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
