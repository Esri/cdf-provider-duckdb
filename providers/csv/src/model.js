const koopConfig = require("config");
const fs = require("fs");
const Papa = require("papaparse");
const URL = require("url").URL;
const { glob } = require("glob");
const translate = require("./utils/translate-csv");

function Model(koop) {}

Model.prototype.getData = async function (req, callback) {
  const config = koopConfig["koop-provider-csv"];
  const sourceId = req.params.id;
  const sourceConfig = config.sources[sourceId];

  const hasUrlString =
    typeof sourceConfig.url === "string" && sourceConfig.url !== "";
  const hasPathString =
    typeof sourceConfig.path === "string" && sourceConfig.path !== "";

  if (!hasUrlString && !hasPathString) {
    console.error(
      new Error(
        'No CSV source specified. Either "url" or "path" must be specified at the source configuration.'
      )
    );
    callback(new Error("Invalid CSV source."));
    return;
  }

  if (hasUrlString && hasPathString) {
    console.error(
      new Error(
        'Invalid CSV source. Either "url" or "path" must be specified at the source configuration.'
      )
    );
    callback(new Error("Invalid CSV source."));
    return;
  }

  try {
    let csvData;

    if (hasUrlString) {
      csvData = await readFromUrl(sourceConfig.url);
    } else {
      csvData = await readFromPath(sourceConfig.path);
    }

    const geojson = translate(csvData, sourceConfig);
    callback(null, geojson);
  } catch (error) {
    console.error(error);
    callback("Unable to read CSV data");
  }
};

async function readFromUrl(url) {
  let readStream;

  if (isUrl(url)) {
    // this is a network URL
    const res = await fetch(url);
    readStream = res.body;
  } else if (url.toLowerCase().endsWith(".csv") && fs.existsSync(url)) {
    // this is a file path
    readStream = fs.createReadStream(url, "utf8");
  } else {
    throw new Error(`Invalid CSV source url: not a URL or a CSV file path`);
  }

  return paraseData(readStream);
}

const isUrl = (s) => {
    try {
      new URL(s);
      return true;
    } catch (err) {
      return false;
    }
  };


async function readFromPath(path) {
    //console.log(path)
//   const filePaths = await glob(path, {
//     nodir: true,
//   });

//   const sortedPaths = filePaths.sort((a, b) => {
//     const birthtimeA = fs.statSync(a).birthtimeMs;
//     const birthtimeB = fs.statSync(b).birthtimeMs;
//     return birthtimeB - birthtimeA;
//   });

    const readStream = fs.createReadStream(path);
    const data = await parseData(readStream);
  
  
    return data;
}

async function parseData(readStream) {
  return new Promise((resolve, reject) => {
    Papa.parse(readStream, {
      header: true,
      dynamicTyping: true,
      complete: function (result) {
        if (result.errors.length > 0) {
          callback(reject(new Error(result.errors[0].message)));
        } else {
          resolve(result.data);
        }
      },
      error: reject,
    });
  });
}

module.exports = Model;