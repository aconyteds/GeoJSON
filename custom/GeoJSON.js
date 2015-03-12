define(["dojo/request/xhr", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "esri/layers/GraphicsLayer", "esri/graphic", "dojo/Stateful", "dojo/Deferred",
"esri/Color", "esri/geometry/Point", "esri/geometry/Polygon", "esri/geometry/Polyline", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol"], 
    function(xhr, lang, array, declare, GraphicsLayer, Graphic, Stateful, Deferred,
    Color, Point, Polygon, Polyline, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol){  
    /** 
     * GeoJSON supports the following geometry types: Point, LineString, Polygon, MultiPoint, MultiLineString, and MultiPolygon. 
     * Lists of geometries are represented by a GeometryCollection. 
     * Geometries with additional properties are Feature objects. 
     * And lists of features are represented by a FeatureCollection.
     **/
    return declare([GraphicsLayer, Stateful],{
        constructor:function(layerDefinition, options){
            console.log(this,  options);
            this._initVariables(options||{});
            this[typeof layerDefinition==="string"?"_createLayerFromUrl":"_createLayerFromJSON"](layerDefinition, this);
        },
        _initVariables:function(options){
            if(lang.exists("InfoTemplate", options))
                this.setInfoTemplate(options.InfoTemplate);
            if(lang.exists("refreshInterval", options))
                this.setRefreshInterval(options.refreshInterval);
            if(lang.exists("opacity", options))
                this.setOpacity(options.opacity);
            if(lang.exists("visible", options))
                this[options.visible?"show":"hide"]();
            if (!lang.exists("PointSymbol", options))
                lang.mixin(options, {PointSymbol:new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,0,0]), 1),
                    new Color([50,50,50,0.25]))});
            if(!lang.exists("PolygonSymbol", options))
                lang.mixin(options, {PolygonSymbol:new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0]), 1),
                    new Color([50,5,50,0.25]))});
            if(!lang.exists("PolylineSymbol", options))
                lang.mixin(options, {PolylineSymbol:new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([0,0,0]))});
            this.set("PointSymbol", options.PointSymbol);
            this.set("PolygonSymbol", options.PolygonSymbol);
            this.set("PolylineSymbol", options.PolylineSymbol);
        },
        _createLayerFromJSON:function(jsonObj, layer){
            console.log(jsonObj);
            function parseFeatures(arr){
                var def=new Deferred()
                array.forEach(arr, lang.hitch(this, function(feature, i){
                    var type;
                    switch(feature.geometry.type){
                        case "Point":
                        case "Polygon":
                            type=feature.geometry.type;
                            break;
                        case "LineString":
                            type="Polyline";
                    }
                    layer.add(createGraphic(type, feature.geometry, feature.properties));
                    if(i===arr.length)
                        def.resolve();
                }));
                function createGraphic(type, data, attributes){
                    function getFunc(t){switch(t){case "Point": return Point; case "Polygon":return Polygon; case "Polyline":return Polyline;}}
                    return new Graphic(new getFunc(type)(data.coordinates), layer.get(type+"Symbol"), attributes);
                }
                return def.promise;
            }
            parseFeatures(jsonObj.features).then(function(){
                layer.redraw();
            });
        },
        _createLayerFromUrl:function(url, layer){
            xhr(url, {handleAs:"json"}).then(lang.hitch(this, function(result){
                this._createLayerFromJSON(result, layer);
            }),function(err){
                console.log("ERROR OCCURED WHEN TRYING TO LOAD: "+url,"Error Details: " + err.message);
            });
        },
        _PointSymbol:null,
        _PolygonSymbol:null,
        _PolylineSymbol:null,
        _PointSymbolGetter:function(){
            return this._PointSymbol;
        },
        _PointSymbolSetter:function(symbol){
            this._PointSymbol=symbol;
        },
        _PolygonSymbolGetter:function(){
            return this._PolygonSymbol;
        },
        _PolygonSymbolSetter:function(symbol){
            this._PolygonSymbol=symbol;
        },
        _PolylineSymbolGetter:function(){
            return this._PolylineSymbol;
        },
        _PolylineSymbolSetter:function(symbol){
            this._PolylineSymbol=symbol;
        }
    });
});