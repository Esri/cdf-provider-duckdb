const koopConfig = require("config");
var parquet = require('@dsnp/parquetjs');
const fs = require('fs');
const path = require('path');
const translate = require("./utils/translate-parquet");

function Model(koop) {}

Model.prototype.getData = async function (req, callback) {
  const config = koopConfig["provider-parquet"];
  const sourceId = req.params.id;
  const sourceConfig = config.sources[sourceId];

  try {
    let parquetData = await readFromPath(sourceConfig.path); 
    const geojson = translate(parquetData, sourceConfig);
    callback(null, geojson);
  } catch (error) {
    console.error(error);
    callback("Unable to read parquet data");
  }
}

async function readFromPath(parquetPath) {
  if (!fs.existsSync(parquetPath)) {
    throw Error('Invalid Parquet Path');
  }

  let data = [];
  if (fs.lstatSync(parquetPath).isDirectory()) {
    var files = fs.readdirSync(parquetPath).filter(fn => fn.endsWith('.parquet'));
    for (let i = 0; i < files.length; i++) {
      data = data.concat(await parseParquet(path.join(parquetPath, files[i]))); 
    }
  } else {
    data = await parseParquet(parquetPath); 
  }
  return data;
}

async function parseParquet(parquetPath) {
  let parquetData = [];
  let reader = await parquet.ParquetReader.openFile(parquetPath);
  let cursor = reader.getCursor();
  let record = null;
  while ((record = await cursor.next())) {
    parquetData.push(record);
  }
  await reader.close();
  return parquetData;
}

module.exports = Model;