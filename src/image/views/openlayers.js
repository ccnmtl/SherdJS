if (!Math.log2) {
    var div = Math.log(2);
    Math.log2 = function(x) {
	return Math.log(x)/div;
    }
}
if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.OpenLayers) {
    Sherd.Image.OpenLayers = function() {
	var self = this;
	var Mochi = MochiKit.DOM;
	Sherd.Base.AssetView.apply(this,arguments); //inherit

	this.openlayers = {
	    'features':[],
	    'feature2json':function(feature) {
		if (self.openlayers.GeoJSON) {
		    return {'geometry':self.openlayers.GeoJSON.extract.geometry.call(
			self.openlayers.GeoJSON, feature.geometry
		    )};
		}
	    },
	    'object_proportioned':function(object) {
		var dim = {w:180,h:90};
		var w = object.width||180;//76.23;//
		var h = object.height||90;
		if (w/2 > h) {
		    dim.h = Math.ceil(180*h/w);
		} else {
		    dim.w = Math.ceil(90 *w/h);
		}
		return dim;
	    },
	    'object2bounds':function(object) {
		///TODO:figure these out better
		///should fail without w/h better
		///test image: 466x550, 1694x2000
		///180/2000.0 * 1694 = 152.46 (/2 = 76.23)
		var dim = self.openlayers.object_proportioned(object);
		return new OpenLayers.Bounds(-dim.w,
					     -dim.h,
					     dim.w,
					     dim.h
					    );
	    }
	};


	this.presentations = {
	    'thumb':{
		height:function(){return '100px'},
		width:function(){return '100px'},
		initialize:function(obj,presenter){
		    ///remove controls
		    var m = presenter.openlayers.map;
		    while (m.controls.length) {
			m.removeControl(m.controls[0]);
		    }
		}
	    },
	    'default':{
		height:function(obj,presenter){return (Mochi.getViewportDimensions().h-250 )+'px'},
		width:function(obj,presenter){return '100%'},
		initialize:function(obj,presenter){
		    ///TODO:this should use presenter.events to register, so it can auto-deregister on finish
		    connect(window,'onresize',function() {
			presenter.components.top.style.height = (Mochi.getViewportDimensions().h-250 )+'px';
		    });
		}
	    },
	    'small':{
		height:function(){return '300px'},
		width:function(){return '300px'},
		initialize:function(){/*noop*/}
	    }
	}

	this.currentfeature = false;

	this.getState = function() {
	    var geojson = {};
	    if (self.currentfeature) {
		geojson = self.openlayers.feature2json(self.currentfeature);
	    } 
	    var m = self.openlayers.map;
	    if (m) {
		var center = m.getCenter();
		geojson['default'] = (!geojson.geometry && center.lon==0 && center.lat==0);
		geojson['x']=center.lon; 
		geojson['y']=center.lat;
		geojson['zoom']=m.getZoom();
		//TODO:should influence how we do setState() too, since
		///feature is essentially relative to this
		geojson['extent'] = m.getMaxExtent().toArray();
	    }
	    return geojson;
	}
	this.setState = function(obj) {
	    var state = {
		/*
		'x':0,//center of -180:180
		'y':0,//center of -90:90
                */
		//x:-135,y:45,
		'zoom':2
	    };
	    if (typeof obj=='object') {
		if (obj.feature) {
		    self.currentfeature = obj.feature;
		} else if (obj.geometry) {//obj is a json feature
		    self.currentfeature = self.openlayers.GeoJSON.parseFeature(obj);
		} else {
		    if (obj.x) state.x = obj.x;
		    if (obj.y) state.y = obj.y;
		    if (obj.zoom) state.zoom = obj.zoom;
		    self.currentfeature = false;
		}
	    }
	    if (self.currentfeature) {
		var style = self.openlayers.vectors.styleMap.styles.select;
		var bounds = self.currentfeature.geometry.getBounds();
		self.openlayers.features = [self.currentfeature, self.currentfeature.clone()];

		//self.currentfeature.style = self.openlayers.vectors.styleMap.styles['sky'];
		self.openlayers.features[1].renderIntent = 'sky2';
		self.currentfeature.renderIntent = 'sky';
		//self.openlayers.features[1].style = self.openlayers.vectors.styleMap.styles['sky'];

		self.openlayers.vectors.addFeatures( self.openlayers.features );
		self.openlayers.map.zoomToExtent(bounds);
	    } else if (state.x) {
		self.openlayers.map.setCenter(
		    new OpenLayers.LonLat(state.x, state.y), state.zoom
		);
	    } else {
		self.openlayers.map.zoomToMaxExtent();
	    }
	}
	this.microformat = {};
	this.microformat.create = function(obj,doc) {
	    var wrapperID = Sherd.Base.newID('openlayers-wrapper');
	    ///TODO:zoom-levels might be something more direct on the object?
	    if (!obj.options) obj.options = {
		numZoomLevels: 5, 
		sphericalMercator: false,
		projection:'Flatland:1',
		///extraneous, for tiling, but ?good? default?
		///must be this way for tiling, in any case.
		maxExtent:new OpenLayers.Bounds(-180, -90, 180, 90)
		//,units:'m'
	    };
	    return {
		object:obj,
		htmlID:wrapperID,
		text:'<div id="'+wrapperID+'" class="sherd-openlayers-map"></div>'
	    }
	}
	this.microformat.update = function(obj,html_dom) {
	    ///1. test if something exists in components now (else return false)
	    ///2. assert( obj ~= from_obj) (else return false)

	    ///TODO (replace map (as a new layer--hide/show?)
	    
	}
	this.microformat.write = function(create_obj,html_dom) {
	    if (create_obj && create_obj.text) {
		///boilerplate
		html_dom.innerHTML = create_obj.text;

		///ALL THIS Should all be in initialize() or something
		var top = document.getElementById(create_obj.htmlID);
		self.components = self.microformat.components(top,create_obj);

		var presentation;
		switch (typeof create_obj.object.presentation) {
		case 'string': presentation = self.presentations[create_obj.object.presentation]; break;
		case 'object': presentation = create_obj.object.presentation; break;
		case 'undefined': presentation = self.presentations['default']; break;
		}
		top.style.width = presentation.width(create_obj.object, self);
		top.style.height = presentation.height(create_obj.object, self);

		self.openlayers.map =  new OpenLayers.Map(create_obj.htmlID);

		if (create_obj.object.xyztile) {
		    var opt = create_obj.object.options;
		    ///must be this way for tiling, in any case.
		    opt.maxExtent=new OpenLayers.Bounds(-180, -25, -65, 90);
		    //opt.maxExtent=new OpenLayers.Bounds(-180, -90, 180, 90);
		    if (create_obj.object['xyztile-metadata']) {
			var md = create_obj.object['xyztile-metadata'];
			opt.numZoomLevels = Math.ceil(
			    Math.log2(Math.max(md.height,md.width))-7);
			var dim = self.openlayers.object_proportioned(md);
			opt.maxExtent=new OpenLayers.Bounds(-180, 90-2*dim.h, -180+ 2*dim.w, 90);
		    } else {
			opt.maxExtent=new OpenLayers.Bounds(-180, -90, 180, 90);
		    }
		    ///so it doesn't cut off the bottom/right of the image--by partial tile
		    opt.displayOutsideMaxExtent = true;

		    self.openlayers.graphic = new OpenLayers.Layer.XYZ(
			create_obj.object.title||'Image',
			create_obj.object.xyztile,
			//"http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Portland/ESRI_LandBase_WebMercator/MapServer/tile/${z}/${y}/${x}",
			opt
		    );
		    ///HACK: to make the tiler work for partial tiles (e.g. not exactly 256x256)
		    
		    self.openlayers.graphic.getImageSize = function(){return null;};
		    self.openlayers.graphic.zoomToMaxExtent=function(){
			self.openlayers.map.setCenter(this.maxExtent.getCenterLonLat());
		    };
		} else {
		    var o2b = self.openlayers.object2bounds;
		    var bounds = o2b(create_obj.object);
		    ///TODO: if no create_obj.object.width, test with createElement('img')
		    var dim = self.openlayers.object_proportioned(create_obj.object);

		    create_obj.object.options.maxExtent = o2b(create_obj.object);
		    self.openlayers.graphic = new OpenLayers.Layer.Image(
			create_obj.object.title||'Image',
			create_obj.object.image,//url of image
			bounds,
			//just proportional size: probably much smaller than the actual image
			///this allows us to 'zoom out' to smaller than actual image size
			new OpenLayers.Size(dim.w, dim.h),
			create_obj.object.options
		    );
		}

		self.openlayers.vectors = new OpenLayers.Layer.Vector("Vector Layer");
		var styles  = {
		    'sky':new OpenLayers.Style({fillOpacity:0,
						strokeWidth:4,
						strokeColor:'#000000'
					       }),
		    'sky2':new OpenLayers.Style({fillOpacity:0,
						 strokeWidth:2
						})
		};
		self.openlayers.vectors.styleMap = new OpenLayers.StyleMap(styles);


		self.openlayers.map.addLayers([self.openlayers.graphic, self.openlayers.vectors]);
		var projection = 'Flatland:1';//also 'EPSG:4326' and Spherical Mercator='EPSG:900913'
		self.openlayers.GeoJSON = new OpenLayers.Format.GeoJSON(
		    {'internalProjection': self.openlayers.map.baseLayer.projection,
		     'externalProjection': new OpenLayers.Projection(projection)}
		);

		presentation.initialize(create_obj.object,self);
	    }
	}
	this.microformat.components = function(html_dom,create_obj) {
	    return {'top':html_dom};
	}
    }//END Sherd.Image.OpenLayers

}//END if (!Sherd.Image.OpenLayers)


/****
An annotation looks like this:
///1
{"type":"Feature", 
 "id":"OpenLayers.Feature.Vector_92", 
 "properties":{}, 
 "geometry":{"type":"Polygon", 
             "coordinates":[[ [-37.8125, 17.1875], 
                              [-37.5, -2.5], 
                              [-2.8125, 11.25], 
                              [-37.8125, 17.1875]
                           ]]
            }, 
 "crs":{"type":"OGC", 
        "properties":{"urn":"urn:ogc:def:crs:OGC:1.3:CRS84"}}
}


///2
{"type":"Feature", 
 "id":"OpenLayers.Feature.Vector_78", 
 "properties":{},  
 "geometry":{"type":"Point", 
             "coordinates":[0.3125, -2.96875]
            }, 
 "crs":{"type":"OGC", 
        "properties":{"urn":"urn:ogc:def:crs:OGC:1.3:CRS84"}}
}


***/