const koopConfig = require("config");
var parquet = require('@dsnp/parquetjs');
const fs = require('fs');
const path = require('path');
const translate = require("./utils/translate-parquet");

function Model (koop) {}

Model.prototype.getData = async function (req, callback) {
  const config = koopConfig["provider-parquet"];
  const sourceId = req.params.id;
  const sourceConfig = config.sources[sourceId];

  // TODO: add support for a singular .parquet file with a isDir check 

  try { 

    var files = fs.readdirSync(sourceConfig.path).filter(fn => fn.endsWith('.parquet'));
    let parquetData = [];

    for (let i = 0; i < files.length; i++) {
      let reader = await parquet.ParquetReader.openFile(path.join(sourceConfig.path, files[i]));
      let cursor = reader.getCursor();
      let record = null;
      while ((record = await cursor.next())) {
        parquetData.push(record);
      }
      await reader.close();
   }

    const geojson = translate(parquetData, sourceConfig);
    callback(null, geojson);
  } catch (error) {
    console.error(error);
    callback("Unable to read parquet data");
  }
}

module.exports = Model
