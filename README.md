![image](https://github.com/EsriPS/BDT_cdf/assets/28267620/edc83af4-bfc6-41cf-a170-dcf7170dbe60)

# BDT_cdf
This repo is an exploratory effort into using custom data feeds with big data. 

## 🦆 DuckDB CDF with NY city taxi dataset and H3 bins (10 million points): 
https://github.com/user-attachments/assets/ddb26b4d-38f8-4958-8f86-78f03407621c

## ❓ How do I make my own custom data feed?: 
- Checkout [guide.md](https://github.com/EsriPS/BDT_cdf/blob/master/guide.md) which is a step by step guide on everything you need to know on creating your own custom datafeed
- Or see the most up to date offical [documentation](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/pass-through-custom-data-providers/) and [walkthrough](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/create-a-yelp-custom-data-feed/)

## 🌎 Understanding how geoservices rest API clients work at a high level: 
I failed to understand how the interaction works between client and server with geoservices for a while and was quite confused. Hopefully this short write up will help you! The query documentation is listed [here](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/) and see more details [here](https://developers.arcgis.com/enterprise-sdk/guide/custom-data-feeds/pass-through-custom-data-providers/)
- At high level first an ArcGIS/Geoservices client makes a request to your feature server example `http://127.0.0.1:8080/duckdb/rest/services/myparquet/FeatureServer/0?f=json`. This initial request is just asking for metadata and information about the data server
- Then the client makes another initial request to something like `http://127.0.0.1:8080/duckdb/rest/services/myparquet/FeatureServer/0/query?f=json&returnIdsOnly=true&returnCountOnly=true&orderByFields=&outSR=102100&returnGeometry=false&spatialRel=esriSpatialRelIntersects&where=1%3D1` because of the `returnIdsOnly` and `returnCountOnly` fields, this request is just asking for the size of your data source.
- Once the client knows metadata about your feature server and the size of your data source, its able to make queries with pagination as the user scrolls and pans the map 

## 📚 Helpful Resources
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

## 📞 Helpful Esri Contacts: 
- John Hash (Production Engineer - jhash@esri.com) - helped me deploy cdfs 
- Rich Gwozdz (Principal Software Development Engineer - rgwozdz@esri.com) - main developer of koop/cdfs
- Shawn Goulet (Sr. Software Development Engineer - sgoulet@esri.com) - worked on a google roads cdf
