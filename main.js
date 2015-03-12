require(["esri/map", "custom/GeoJSON", "custom/layers", "dojo/topic", "dojo/domReady"],
function(esriMap, GeoJSON, layers, topic){
    var map = new esriMap("map", {
        basemap:"streets",
        center:[-93.636, 46.882],
        zoom:7,
        slider:false
    });
    var lyrHandler=new layers({map:map});
    //topic.publish(lyrHandler.CHANNELS.NEW.LAYER, "https://iwilson2.esri.com/arcgis/rest/services/Specialty/Sample/MapServer/0");
    var myLayer=new GeoJSON("./resources/FeatureCollection.json");
    map.addLayer(myLayer);
    //console.log(myLayer);
});