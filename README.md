# BDT_cdf
This repo is a exploratory effort into using custom data feeds with big data. 

## NodeJS and CDF CLI Installation 
1. Install NodeJS using nvm or just manually installing the msi installer. I manually downloaded 20.11.1 windows msi from these [versions](https://nodejs.org/dist/). See this [document](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/installing-and-configuring-custom-data-feeds/) for matching ArcGIS Enterprise versions. 
2. Install ArcGIS Enterprise SDK by manually installing the exe from Esri internal release network drive (must be on Esri network) `\\esri.com\software\Esri\Released\113_Final` with the file name `ArcGIS_Enterprise_SDK_Windows_113_190284.exe`. Copy this to your desktop and run the exe
3. After following through setup, restart your cmd window and then do `cdf -h`. This is supposed to display a help menu afte installing. For me nothing showed up, so I went to `C:\Program Files\ArcGIS\EnterpriseSDK\customdatacli` and ran `activate_cdf.bat` which solved my issues and made `cdf` a recognizable command.

## Using this repo
- If you are wanting to use the existing providers and data feeds inside of this repo under `/bdt_cdf`, just do `npm install` (note: this untested)
- Then to run do TODO: Figure this out 

## Creating a new custom datafeed
- Once CDF cli is installed from Enterprise SDK, do `cdf createapp bdt_cdf` which will generate a bunch of nodeJS boilerplate for you. A custom datafeed is built on top of Koop which is built on top of Express.JS 
- To create a new custom data feed you need to make a data provider. `cd` into your new app directory and then do `cdf createprovider <customprovidername>`
- This will add a `/providers` folder and within this there will be a folder named what you named it above 
- Within the provider there is a `model.js` file which handles the logic for fetching the data and returning GeoJSON 
- After adding code to fetch your data from your datasource and then return as GeoJSON, to test the server do TODO: Figure this out

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