function translate(data, config, idField) {
    const metadata = config.properties || {};
    const columns = Object.keys(data[0]);
    
    if (!columns.includes(idField)) {
      console.warn(`Specified ID field "${idField}" is not found.`);
      return null;
    }
   
    return {
      type: "FeatureCollection",
      features: data.map((row) =>
        formatFeature(row, columns, idField, config.geomOutColumn)
      ),
      properties: metadata,
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
        let geom = values[columns[i]]
        var geometry = JSON.parse(geom);
        feature.geometry = geometry;
      } else {
        if (columns[i] == idField) {
          if (!isValidId(value)) {
            console.warn(`Invalid ID value: ${value}`);
          } 
        }
        feature.properties[columns[i]] = value;
      }
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