![image](https://github.com/EsriPS/BDT_cdf/assets/28267620/edc83af4-bfc6-41cf-a170-dcf7170dbe60)

# BDT_cdf
This repo is an exploratory effort into using custom data feeds with big data. 

## 🦆 DuckDB CDF with NY city taxi dataset and H3 bins (10 million points): 
https://github.com/user-attachments/assets/ddb26b4d-38f8-4958-8f86-78f03407621c

## ⚡ Quickstart
- If you are wanting to use the existing providers and data feeds inside of this repo under `/bdt_cdf`, just do `npm install` (note: this is untested)
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

## ❓ How do I make my own custom data feed?: 
See the most up to date [documentation](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/pass-through-custom-data-providers/) and walkthrough [here](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/create-a-yelp-custom-data-feed/)

### Step 1 - NodeJS and CDF CLI Installation:
- Install NodeJS using nvm or just manually installing the msi installer. I manually downloaded 20.11.1 windows msi from these [versions](https://nodejs.org/dist/). See this [document](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/installing-and-configuring-custom-data-feeds/) for matching ArcGIS Enterprise versions. 
- Install ArcGIS Enterprise SDK by manually installing the exe from Esri internal release network drive (must be on Esri network) `\\esri.com\software\Esri\Released\113_Final` with the file name `ArcGIS_Enterprise_SDK_Windows_113_190284.exe`. Copy this to your desktop and run the exe
- After following through setup, restart your cmd window and then do `cdf -h`. This is supposed to display a help menu after installing. For me nothing showed up, so I went to `C:\Program Files\ArcGIS\EnterpriseSDK\customdatacli` and ran `activate_cdf.bat` which solved my issues and made `cdf` a recognizable command.

### Step 2 - Creating a new custom datafeed application:
- Once the CDF cli is installed from the Enterprise SDK, do `cdf createapp new_cdf` which will generate a bunch of nodeJS boilerplate for you (`/bdt_cdf` contains an example of all of this boilerplate). A custom datafeed is built on top of [Koop](https://koopjs.github.io/docs) which is built with [express.js](https://expressjs.com/)

### Step 3 - Create your own custom data provider for your data source:
- To create a new custom data feed you need to make a data provider. `cd` into your new app directory and then do `cdf createprovider <customprovidername>`
- This will add a `/providers` folder and within this there will be a folder named what you named it above
- You will want to decide if your provider is a pass through provider or a full fetch provider. More info [here](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/create-a-custom-data-feed-provider/) about the differences 
- Within the provider there is a `model.js` file which handles the logic for fetching the data and returning GeoJSON 
- For a simple example on how this works see `providers/csv` which is forked from [koop-provider-csv](https://github.com/koopjs/koop-provider-csv). The `model.js` reads from a `config/default.json` which contains metadata and information about the schema structure of the csv. It then uses [Papaparse](https://www.papaparse.com/) to read the csv and then translate it to GeoJSON (see `utils/translate-csv.js`)
- After adding code to fetch your data from your datasource and return as GeoJSON, test the server with `npm start` which should display a list of routes in the terminal
- One key thing to note is that there is important metadata and filters that are set on the GeoJSON object you return from your `model.js` file. See [here](https://github.com/koopjs/FeatureServer#featureserverroute) for a list of all the flags to be set and see `providers/duckdb` for an example
- To see a query parameter list that will be sent to your CDF geoservice API see [here](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/)
- Koop contains existing provider [plugins](https://koopjs.github.io/docs/available-plugins/providers) you can use as an example
- To see complex examples with pagination and SQL queries see `/providers/duckb` and [elastic-sql](https://github.com/koopjs/koop-provider-elastic-sql/tree/main)

### Step 4 - Testing your CDF locally: 
- To do local development on your CDF and test it you need to send GET requests to your feature server url
- One way to do this is using something like [postman](https://www.postman.com/) or with the vs code extension [postcode](https://github.com/rohinivsenthil/postcode)
- Postman/Postcode is nice for quick testing but there is no map component. To get a map UI, you can also use the ArcGIS JS API to create a featureLayer object in a html file. See `frontend/index.html` for an example of this. This is helpful as you can view the network tab in chrome developer tools to see the requests the client is sending to your CDF server
- Another option is to add your data inside of ArcGIS Pro. You can do this by doing "Add Data" and then "Data From Path" and then use something like `http://127.0.0.1:8080/yourprovidername/rest/services/yourdatasourcename/FeatureServer`

### Step 6 - ArcGIS Server Installation: 
- To deploy a cdf, one option is to use docker and package your server to run in the cloud as a docker container
- Another option is to upload your code to ArcGIS Server. To do this you use the cdf cli that comes with the ArcGIS Enterprise SDK. Do `cdf export <providername>` which will export the code into a `.cdpk` file. 
- A `.cdpk` is just a renamed zip file of your data provider code that is uploaded to ArcGIS Server for deployment
- Once you have the `.cdpk` file, you will need a machine running with ArcGIS server.
- The easiest way to do this is reach out to Kevin Lam (Principal Product Engineer - klam@esri.com). There is an automated deployment system (which I believe Kevin helps manage) which makes getting an ArcGIS Enterprise machine extremely easy. The other option is to manually setup ArcGIS server, see this [guide](https://enterprise.arcgis.com/en/server/latest/install/windows/steps-to-get-arcgis-for-server-up-and-running.htm)
- To request a VM you'll need access to VM Ware in Okta (you may have to open a service now ticket for access to this system) and you will need to create an VMWare API token.
- Once you have an API token, go to https://psecs.esri.com/ (you may need to be on the esri VPN) to request a VM
- Once requested you can view the build status of your VM here at http://mcsinstall1:8080/view/ECS/job/ECS_Enterprise/ (need to be on Esri VPN)
- Once the VM is successfully up and running, RDP into it using the IP given to you via email
- Once you remote in you will need to install the custom datafeeds runtime. This is named `ArcGIS_Custom_Data_Feeds_Windows_113_190285.exe` from Esri internal release network drive (must be on Esri network) `\\esri.com\software\Esri\Released\113_Final`. Make sure to use the correct version for your use case
- Run this exe on the server. You are now ready to upload your .cdpk

### Step 5 - Deploying a CDF to ArcGIS Server:
- There are 3 main ways to upload a `.cdpk` to an ArcGIS Server instance. CDF CLI, ArcGIS Server admin portal, and ArcGIS Server Manager. I won't be covering the CLI method.
- This will require you to know the base url given to you in VMWare - example `https://ps0023645.esri.com`. (for reference the homepage for my VM server was `https://ps0023645.esri.com/portal/home`)
#### ArcGIS Server manager: 
- Navigate to `https://yourserverurl.esri.com:6443/arcgis/manager/index.html`
- Click `Site` on the top tab and navigate to `Custom Datafeeds`
- Then after clicking on `Custom Datafeeds`, select `Add Custom Data provider`
- Upload your `.cdpk` file
- After that uploads successfully, navigate back to `Services` at the top. Then select `Publish Service` in the top right. Then select `From a registered custom data provider`
- Select your cdf from the dropdown and then make sure to put whatever your data source was named (this shows up in the localhost featureserver url)
- Set a name for your feature service and then select `Publish`
- If everything worked, you should be able to navigate to `https://yourserverurl.esri.com/portal/home/content.html` and you should your feature server listed there in the content. Add it to a AGOL web app and see if data starts populating. If data does not show up, then see the next section on debugging deployment

#### ArcGIS Server Admin Directory: 
- You can also upload your `.cdpk` file to the ArcGIS Server Admin directory found at `https://yourserverurl.esri.com:6443/arcgis/admin/`
- See more on how to do this [here](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/register-a-custom-data-provider/)

### Step 6 - Debugging a deployed CDF on ArcGIS Server: 
- If you run into issues when deploying a CDF on your server, remote into your server instance and navigate to `C:\Program Files\ArcGIS\Server\framework\runtime\customdata\logs`. There you should be able to find log output of your CDF instance
- If you want to make changes to your provider code (like console logging a variable for debugging purposes), navigate to `C:\Program Files\ArcGIS\Server\framework\runtime\customdata\providers` and find your code. Run notepad as admin and open the `model.js` file (or install VSCode on your server).
- After making changes to your code and saving the file, you will need to restart ArcGIS server. To restart it, search for `Computer Management` in Windows and find `Services`. Inside of `Services` find `ArcGIS Server`, right click, and `Restart`
- After restarting a new log file should appear in `C:\Program Files\ArcGIS\Server\framework\runtime\customdata\logs`

## Understanding how geoservices rest API clients work at a high level: 
I failed to understand how the interaction works between client and server with geoservices for a while and was quite confused. Hopefully this short write up will help you! The query documentation is listed [here](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/) and see more details [here](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/pass-through-custom-data-providers/)
- At high level first an ArcGIS/Geoservices client makes a request to your feature server example `http://127.0.0.1:8080/duckdb/rest/services/myparquet/FeatureServer/0?f=json`. This initial request is just asking for metadata and information about the data server
- Then the client makes another initial request to something like `http://127.0.0.1:8080/duckdb/rest/services/myparquet/FeatureServer/0/query?f=json&returnIdsOnly=true&returnCountOnly=true&orderByFields=&outSR=102100&returnGeometry=false&spatialRel=esriSpatialRelIntersects&where=1%3D1` because of the `returnIdsOnly` and `returnCountOnly` fields, this request is just asking for the size of your data source.
- Once the client knows metadata about your feature server and the size of your data source, its able to make queries with pagination as the user scrolls and pans the map 

## Helpful Resources
- https://developers.arcgis.com/enterprise-sdk/
- https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/installing-and-configuring-custom-data-feeds/
- https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/
- https://enterprise.arcgis.com/en/server/latest/install/windows/welcome-to-the-arcgis-for-server-install-guide.htm
- https://www.esri.com/arcgis-blog/products/arcgis-enterprise/data-management/dev-summit-2023-custom-data-feeds/
- https://www.esri.com/arcgis-blog/products/arcgis-enterprise/developers/new-in-arcgis-enterprise-11-1-custom-data-feeds/
- https://youtu.be/0T9iF4FSoxs?si=9C5oBLcO-sw4m1-c
- https://mediaspace.esri.com/media/t/1_kk12l8t8
- https://koopjs.github.io/docs/available-plugins/providers
- https://github.com/koopjs/FeatureServer#featureserverroute
- https://github.com/koopjs/geoservice-utils
- https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/

## Helpful Esri Contacts: 
- John Hash (Production Engineer - jhash@esri.com) - helped me deploy cdfs 
- Rich Gwozdz (Principal Software Development Engineer - rgwozdz@esri.com) - main developer of koop/cdfs
- Shawn Goulet (Sr. Software Development Engineer - sgoulet@esri.com) - worked on a google roads cdf
