define(["dojo/_base/declare", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/ArcGISImageServiceLayer", "esri/layers/ArcGISTiledMapServiceLayer", "esri/layers/FeatureLayer", "esri/layers/KMLLayer", 
"esri/layers/OpenStreetMapLayer", "esri/layers/WMSLayer", "esri/layers/WMTSLayer", "dojo/topic", "dojo/_base/lang", "dojo/request/xhr", "dijit/_WidgetBase", "dojo/_base/array", "dojo/Deferred","esri/request", "dojo/promise/all",
"dojo/on"],
function(declare, dynamicLayer, imageLayer, tiledLayer, featureLayer, kmlLayer,
osmLayer, wmsLayer, wmtsLayer,  topic, lang, xhr, _widgetBase, array, Deferred, esriRequest, all,
on){
    var imw={
        top:function(a){
            return a[a.length-1];
		},
		remArr:function(arr, val, rec)//target array, value to remove, recursive flag
		{
            do
            {
                arr.splice(array.indexOf(arr, val), 1);
                if(array.indexOf(arr, val)===-1 && rec)
                    rec=0;
            }while(rec)
            return arr;
		}
    }; 
    return declare([_widgetBase],{
        CHANNELS:{
            MAP:{
                LAYER_ADD:"map/layer/add",
                LAYER_REMOVE:"map/layer/remove",
                UPDATE_START:"map/update/start",
                UPDATE_END:"map/update/end"
            },
            LAYER:{
                UPDATE_START:"layer/update/start",
                UPDATE_END:"layer/update/end"
            },
            NEW:{
                LAYER:"new/layer",
                BASEMAP:"new/basemap"
            },
            GET:{
                LAYER:{
                    INDEX:"get/layer/index",
                    TYPE:"get/layer/type",
                    TOTAL:"get/layer/total",
                    ALL:"get/layers"
                }
            },
            RETURN:{
                LAYER:{
                    INDEX:"return/layer/index",
                    TYPE:"return/layer/type",
                    TOTAL:"return/layer/total",
                    ALL:"return/layers"
                }
            }
        },
        postMixInProperties:function(){
            this.layers=[];
            this._connects=[];
        },
        postCreate:function(){
            this.inherited(arguments);
            var channels=this.CHANNELS;
            on(this.params.map, "layer-add", function(layer){
                topic.publish(channels.MAP.LAYER_ADD, layer.layer);
                var uHandler=on(layer.layer, "update-start", function(){
                    topic.publish(channels.LAYER.UPDATE_START, layer.layer);
                    topic.subscribe(channels.MAP.LAYER_REMOVE, function(data){
                        if(data===layer.layer)
                            uHandler.remove();
                    });
                });
            });
            on(this.params.map, "layer-remove", function(layer){
                topic.publish(channels.MAP.LAYER_REMOVE, layer.layer);
            });
            on(this.params.map, "update-start", function(){
                topic.publish(channels.MAP.UPDATE_START, this);
            });
            on(this.params.map, "update-end", function(){
                topic.publish(channels.MAP.UPDATE_END, this);
            });
            this._connects.push(topic.subscribe(channels.NEW.LAYER, lang.hitch(this, function(url, params, type, source){
                if (type!=="basemap") {
                    this.buildLayer(url, params||null, type||null);
                }
                else
                {
                    this.layers.push({layer:url, type:type, src:source});
                    topic.publish(channels.NEW.BASEMAP, imw.top(this.layers));
                }
            })));
            this._connects.push(topic.subscribe(channels.GET.LAYER.ALL, lang.hitch(this, function(){
                topic.publish(channels.RETURN.LAYER.ALL, this.layers);
            })));
            this._connects.push(topic.subscribe(channels.GET.LAYER.TOTAL, lang.hitch(this, function(){
                topic.publish(channels.RETURN.LAYER.TOTAL, this.layers.length);
            })));
            this._connects.push(topic.subscribe(channels.GET.LAYER.TYPE, lang.hitch(this, function(type){
                var LYRS=imw.remArr(array.map(this.layers, function(lyr){
                    if(lyr.type==type)
                        return lyr;
                    else
                        return "empty";
                }), "empty", 1);
                topic.publish(channels.RETURN.LAYER.TYPE, LYRS);
            })));
            this._connects.push(topic.subscribe(channels.GET.LAYER.INDEX, lang.hitch(this, function(index){
                var LYRS=this.layers[index];
                topic.publish(channels.RETURN.LAYER.INDEX, LYRS);
            })));
            this._connects.push(topic.subscribe(channels.LAYER.UPDATE_START, function(layer){
                on.once(layer, "update-end", function(){
                    topic.publish(channels.LAYER.UPDATE_END, layer);
                });
            }));
        },
        _layerType:function(type){
            switch(type.toLowerCase())
            {
                case "tiled":
                    return tiledLayer;
                case "wms":
                    return wmsLayer;
                case "kml":
                    return kmlLayer;
                case "feature":
                    return featureLayer;
                case "image":
                    return imageLayer;
                default:
                    return dynamicLayer;
            }
        },
        _retrieveServiceJSON:function(serviceURL) {
                var svcJSONdeferred, svcReq;
                svcJSONdeferred = new Deferred();
        
                svcReq = new esriRequest({
                    url: serviceURL, 
                    content: {f:'pjson'},
                    callbackParamName: 'callback',
                });
        
                svcReq.then(function (results){
                    svcJSONdeferred.resolve(results);
                });
        
                return svcJSONdeferred.promise;
        },
        _getType:function(result){
            var type="dynamic";
            //console.log(result);
            if(result.url.search("rest/services")!==-1){//ESRI REST service types
                if ((result.type && result.type.search("Feature Layer")!==-1) || result.url.search("FeatureServer")!==-1)
                    type="feature";
                else if((result.serviceDataType && result.serviceDataType.search("Image")!==-1) || result.url.search("ImageServer")!==-1)
                    type="image";
                else if(result.singleFusedMapCache)
                    type="tiled";
            }
            else if(result.url.search("?request=GetCapabilities&service=WMS")!==-1){//WMS Service Types pulls from SOAP via AGS
                type="wms";
            }
            return type;
        },
        buildLayer:function(url, params, type){
            if(!type){
                all([this._retrieveServiceJSON(url)]).then(lang.hitch(this,function(result){
                    lang.mixin(result[0], {url:url});
                    type=this._getType(result[0]);
                    //console.log(type);
                    this.layers.push({layer:new this._layerType(type)(url, params||null), type:type});
                    this.map.addLayer(imw.top(this.layers).layer);
                }));
            }
            else{//all needed attributes are known, create layer and attach to map
                this.layers.push({layer:new this._layerType(type)(url, params||null), type:type});
                this.map.addLayer(imw.top(this.layers).layer);
            }
        },
        destroy:function(){
            while(this._connects.length){
                this._connects.pop().remove();
            }
        }
    });
});