![image](https://github.com/EsriPS/BDT_cdf/assets/28267620/edc83af4-bfc6-41cf-a170-dcf7170dbe60)

# BDT_cdf
This repo is a exploratory effort into using custom data feeds with big data. 

## ⚡ Quickstart
- If you are wanting to use the existing providers and data feeds inside of this repo under `/bdt_cdf`, just do `npm install` (note: this untested)
- Then to run do `npm start` which will start up the express server. To confirm things are working send a GET request to `localhost:8080/csv/rest/info`. The following routes should be displayed when running the start command 
```console
2024-06-27T17:46:32.174Z info: registered cache: Cache v6.0.0
2024-06-27T17:46:32.177Z info: registered output: GeoServices v8.1.12
2024-06-27T17:46:32.185Z info: "GeoServices" routes for the "csv" provider:
2024-06-27T17:46:32.185Z info: ROUTE | [GET, POST] | /csv/rest/info
2024-06-27T17:46:32.186Z info: ROUTE | [GET, POST] | /csv/rest/generateToken
2024-06-27T17:46:32.186Z info: ROUTE | [GET, POST] | /csv/rest/services/:host/:id/FeatureServer/:layer/:method
2024-06-27T17:46:32.187Z info: ROUTE | [GET, POST] | /csv/rest/services/:host/:id/FeatureServer/layers
2024-06-27T17:46:32.187Z info: ROUTE | [GET, POST] | /csv/rest/services/:host/:id/FeatureServer/:layer
2024-06-27T17:46:32.188Z info: ROUTE | [GET, POST] | /csv/rest/services/:host/:id/FeatureServer
2024-06-27T17:46:32.188Z info: ROUTE | [GET, POST] | /csv/rest/services/:host/:id/FeatureServer*
2024-06-27T17:46:32.188Z info: ROUTE | [GET, POST] | /csv/rest/services/:host/:id/MapServer*
2024-06-27T17:46:32.188Z info: registered provider: csv v11.3.0
2024-06-27T17:46:32.192Z info: Server listening at 8080
```

## NodeJS and CDF CLI Installation 
1. Install NodeJS using nvm or just manually installing the msi installer. I manually downloaded 20.11.1 windows msi from these [versions](https://nodejs.org/dist/). See this [document](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/installing-and-configuring-custom-data-feeds/) for matching ArcGIS Enterprise versions. 
2. Install ArcGIS Enterprise SDK by manually installing the exe from Esri internal release network drive (must be on Esri network) `\\esri.com\software\Esri\Released\113_Final` with the file name `ArcGIS_Enterprise_SDK_Windows_113_190284.exe`. Copy this to your desktop and run the exe
3. After following through setup, restart your cmd window and then do `cdf -h`. This is supposed to display a help menu after installing. For me nothing showed up, so I went to `C:\Program Files\ArcGIS\EnterpriseSDK\customdatacli` and ran `activate_cdf.bat` which solved my issues and made `cdf` a recognizable command.

## ArcGIS Server Installation 
- TODO 

## Creating a new custom datafeed app
- Once CDF cli is installed from Enterprise SDK, do `cdf createapp new_cdf` which will generate a bunch of nodeJS boilerplate for you (`/bdt_cdf` contains an example of all of this boilerplate). A custom datafeed is built on top of [Koop](https://koopjs.github.io/docs) which is built on top of Express.JS 

## Custom data provider
- To create a new custom data feed you need to make a data provider. `cd` into your new app directory and then do `cdf createprovider <customprovidername>`
- This will add a `/providers` folder and within this there will be a folder named what you named it above 
- Within the provider there is a `model.js` file which handles the logic for fetching the data and returning GeoJSON 
- For an example on how this works see `providers/csv` which is forked from [koop-provider-csv](https://github.com/koopjs/koop-provider-csv). The `model.js` reads from a `config/default.json` which contains metadata and information about the schema structure of the csv. It then uses Papaparse to read the csv and then translate it to GeoJSON (see `utils/translate-csv.js`)
- After adding code to fetch your data from your datasource and then return as GeoJSON, to test the server do `npm start` which should display a list of routes in the terminal 

## Deploying a CDF 
- One option is to use docker and package the express server to run in the cloud 
- Another option is to use the cdf cli that comes with the ArcGIS Enterprise SDK. Do `cdf export <providername>` which will export the code into a `.cdpk` file. 
- Take the `.cdpk` file and upload it to ArcGIS Server using the ArcGIS Server REST Admin API upload operation see more [here](https://www.esri.com/arcgis-blog/products/arcgis-enterprise/developers/new-in-arcgis-enterprise-11-1-custom-data-feeds/)

## Helpful Resouces
- https://developers.arcgis.com/enterprise-sdk/
- https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/installing-and-configuring-custom-data-feeds/
- https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/
- https://enterprise.arcgis.com/en/server/latest/install/windows/welcome-to-the-arcgis-for-server-install-guide.htm
- https://www.esri.com/arcgis-blog/products/arcgis-enterprise/data-management/dev-summit-2023-custom-data-feeds/
- https://www.esri.com/arcgis-blog/products/arcgis-enterprise/developers/new-in-arcgis-enterprise-11-1-custom-data-feeds/
- https://youtu.be/0T9iF4FSoxs?si=9C5oBLcO-sw4m1-c
- https://mediaspace.esri.com/media/t/1_kk12l8t8
- https://koopjs.github.io/docs/available-plugins/providers
