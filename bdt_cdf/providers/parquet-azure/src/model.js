const koopConfig = require("config");
var parquet = require('@dsnp/parquetjs');
const fs = require('fs');
const path = require('path');
const translate = require("./utils/translate-parquet");
const { ContainerClient } = require("@azure/storage-blob");
var geojsonRbush = require('geojson-rbush').default;
const turf = require('@turf/turf');

function Model(koop) {}

Model.prototype.getData = async function (req, callback) {
  const config = koopConfig["provider-parquet-azure"];
  const sourceId = req.params.id;
  const sourceConfig = config.sources[sourceId];
  const geoserviceParams = req.query;

  try {
    let parquetData = await readFromAzure(sourceConfig.blobUrl, sourceConfig.fileName);
    var tree = geojsonRbush();
    const geojson = translate(parquetData, sourceConfig);
    const fc = turf.featureCollection(geojson.features);
    fc.properties = geojson.properties;
    tree.load(fc);

    if ("geometry" in geoserviceParams && "geometryType" in geoserviceParams) {
      if (geoserviceParams.geometryType === "esriGeometryEnvelope") {
        let geom = JSON.parse(geoserviceParams.geometry);
        var poly = turf.polygon([[
          [geom.xmin, geom.ymin], 
          [geom.xmin, geom.ymax], 
          [geom.xmax, geom.ymax], 
          [geom.xmax, geom.ymin], 
          [geom.xmin, geom.ymin]
        ]]);
        let intersected = tree.search(poly);
        callback(null, intersected);
      }
    }

  } catch (error) {
    console.error(error);
    callback("Unable to read parquet data");
  }
}

async function readFromAzure(containerUrl, fileName) {
  const containerClient = new ContainerClient(containerUrl);

  let folderFiles = await containerClient.listBlobsByHierarchy("/", { prefix: fileName + "/" });
  if (folderFiles.length == 0) {
    console.log("Its not a folder, downloading the file");
    let blobClient = containerClient.getBlobClient(fileName);
    blobClient.downloadToFile(fileName);
  }
  else { 
    console.log("Its a folder, downloading the files");
    if (!fs.existsSync(fileName)) {
      await fs.promises.mkdir(fileName);
      for await (const blob of folderFiles) {
        if (blob.kind !== "prefix") {
          let blobClient = containerClient.getBlobClient(blob.name);
          await blobClient.downloadToFile("./" + blob.name)
        }
      }
    }
  }
  return await readFromPath(fileName); 
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