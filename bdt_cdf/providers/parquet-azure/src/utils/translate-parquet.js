var wkx = require('wkx');
var idCount = 0;

function translate(data, config) {
    const metadata = config.metadata || {};
    const columns = Object.keys(data[0]);
    
    if (!columns.includes(metadata.idField)) {
      console.warn(`Specified ID field "${metadata.idField}" is not found. Setting to a default id`);
      metadata.idField = "id";
    }
   
    return {
      type: "FeatureCollection",
      features: data.map((row) =>
        formatFeature(row, columns, config.WKBColumn, metadata.idField)
      ),
      metadata,
    };
  }
  
  function formatFeature(values, columns, wkbCol, idField) {
    let feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [],
      },
    };
  
    for (let i = 0; i < columns.length; i++) {
      const value = values[columns[i]];
  
      if (wkbCol == columns[i]) {
        let wkbBuffer = values[columns[i]]
        var geometry = wkx.Geometry.parse(wkbBuffer);
        feature.geometry = geometry.toGeoJSON();
      } else {
        if (columns[i] == idField) {
          if (!isValidId(value)) {
            console.warn(`Invalid ID value: ${value}`);
          } else {
            feature["id"] = value.toString();
          }
        }
        feature.properties[columns[i]] = value;
      }
    }

    if (!columns.includes(idField)){
        feature["id"] = idCount.toString(); 
        idCount++;
    }
  
    if (!isValidGeometry(feature.geometry)) {
      console.warn(
        `Invalid coordinates: ${feature.geometry.coordinates}, setting to [0, 0]`
      );
      feature.geometry.coordinates = [0, 0];
    }
  
    return feature;
  }
  
  // Max ID value supported by feature server:
  // https://koopjs.github.io/docs/usage/provider#setting-provider-metadata-in-getdata
  function isValidId(value) {
    const parsedValue = parseInt(value);
    return 0 <= parsedValue && parsedValue <= 2147483647;
  }
  
  function isValidGeometry(geometry) {
    return (
      !Number.isNaN(geometry.coordinates[0]) &&
      !Number.isNaN(geometry.coordinates[1])
    );
  }
  
  module.exports = translate;