# Important Notes: 
- To see full schema of required args see `src/modules/validate.js`
- `idfield` should **always** be set to OBJECTID, duckdb will create a row number and set it to `OBJECTID` since koop requires an object id field
- other id fields in your data columns can be accessed with sql where queries 

# Adding your own data source: 
- to add another data source copy one of the examples in the `default.json` file
- write SQL query code to create a table with the format you desire, example: 
```javascript
deltaPointsCreateClause = `${secretClause}
CREATE TABLE ${deltaPointsConfig.properties.name} AS 
SELECT * EXCLUDE ${deltaPointsConfig.WKBColumn}, 
ST_GeomFromWKB(CAST(${deltaPointsConfig.WKBColumn} AS BLOB)) AS ${deltaPointsConfig.geomOutColumn}, 
CAST(row_number() OVER () AS INTEGER) AS ${deltaPointsConfig.idField}
FROM delta_scan('${deltaPointsConfig.deltaUrl}');`;
```
- add this SQL query into the `Model` constructor (inside of `model.js`) where duckdb is initalized to create a new table 
- whatever you named the topmost key in `default.json`, you will be access it as a layer in the feature server by doing `http://127.0.0.1:8080/duckdb/rest/services/{yourkeyhere}/FeatureServer`
