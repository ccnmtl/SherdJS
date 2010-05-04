if (!Math.log2) {
    var div = Math.log(2);
    Math.log2 = function(x) {
	return Math.log(x)/div;
    }
}
if (!window.console) {
    window.console = {log:function(){}};
}
if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.OpenLayers) {
    /*reference files 
     * openlayers/openlayers/examples/image-layer.html
     * openlayers/openlayers/examples/modify-feature.html
     * openlayers/openlayers/examples/vector-formats.html
     */
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
		height:function(){return '240px'},
		width:function(){return '320px'},
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
            if (obj==null) obj = {};

	    if (typeof obj=='object' && obj!=null) {
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
                if (!obj.preserveCurrentFocus) {
                    if (obj.zoom &&
                        obj.zoom < self.openlayers.map.getZoomForExtent(bounds)
                       ) {
                        self.openlayers.map.setCenter(bounds.getCenterLonLat(), obj.zoom );
                    } else {
		        self.openlayers.map.zoomToExtent(bounds);
                    }
                }
	    } else if (!obj || !obj.preserveCurrentFocus) {
		if (state.x) {
		    self.openlayers.map.setCenter(
			new OpenLayers.LonLat(state.x, state.y), state.zoom
		    );
		} else {
		    self.openlayers.map.zoomToMaxExtent();
		}
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
	this.initialize = function(create_obj) {
	    if (create_obj) {
	    var top = document.getElementById(create_obj.htmlID);
	    
		var presentation;
		switch (typeof create_obj.object.presentation) {
		case 'string': presentation = self.presentations[create_obj.object.presentation]; break;
		case 'object': presentation = create_obj.object.presentation; break;
		case 'undefined': presentation = self.presentations['default']; break;
		}
		top.style.width = presentation.width(create_obj.object, self);
		top.style.height = presentation.height(create_obj.object, self);

		self.openlayers.map =  new OpenLayers.Map(create_obj.htmlID);
		var objopt = create_obj.object.options;
		if (create_obj.object.xyztile) {
		    ///DOC: Tile x0,y0 upper left starts at (-180,80)
		    ///DOC: whereas single images start at (-180,90)
		    if (create_obj.object['xyztile-metadata']) {
			var md = create_obj.object['xyztile-metadata'];
			objopt.numZoomLevels = Math.ceil(
			    Math.log2(Math.max(md.height,md.width))-7);
			var dim = self.openlayers.object_proportioned(md);
			var px2deg = 180/Math.pow(2,objopt.numZoomLevels+6);
			/*
                         Somehow the maxExtent.bottom affects positioning of annotations across 
                         zoom levels, Futhermore, the top seems to matter also 
                         (setting to 90 also breaks at different places)
                         */
			objopt.maxExtent=new OpenLayers.Bounds(-180, 
							    -280,//80-Math.ceil(md.height*px2deg),
							    -180+Math.ceil(md.width*px2deg), 
							    80);
		    } else {
			//everything should fit in this?
			objopt.maxExtent=new OpenLayers.Bounds(-180, (80-360), 180, 80);
			//earth dimensions
			//opt.maxExtent=new OpenLayers.Bounds(-180, -90, 180, 80);
		    }
		    //opt.maxExtent=new OpenLayers.Bounds(-180, -280, 180, 80);//DEBUG
		    ///so it doesn't cut off the bottom/right of the image--by partial tile
		    //opt.displayOutsideMaxExtent = true;

		    //opt.transitionEffect='resize'; //bug: doesn't hide gutter tiles quickly enough
		    self.openlayers.graphic = new OpenLayers.Layer.XYZ(
			create_obj.object.title||'Image',
			create_obj.object.xyztile,
			//"http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Portland/ESRI_LandBase_WebMercator/MapServer/tile/${z}/${y}/${x}",
			objopt
		    );
		    ///HACK: to make the tiler work for partial tiles (e.g. not exactly 256x256)
		    self.openlayers.graphic.getImageSize = function(){return null;};
		    self.openlayers.graphic.zoomToMaxExtent=function(){
			self.openlayers.map.setCenter(this.maxExtent.getCenterLonLat());
		    };
                    ///HACK: to support Zoomify XYZ tiling as seen at thlib.org
                    /* Zoomify groups tiles into directories each with a maximum of
                       256 tiles.  This code changes the 'TileGroup' based on x,y,z
                       tile coordinates.
                     */
                    if (/TileGroup\d/.test(create_obj.object.xyztile)) {
                        var md = create_obj.object['xyztile-metadata'];
                        var tiles_x = Math.ceil(md.width/256)*2;
                        var tiles_y = Math.ceil(md.height/256)*2;
                        var tiles = [];
                        while (tiles_x >1 && tiles_y>1) {
                            tiles_x = Math.ceil(tiles_x/2);
                            tiles_y = Math.ceil(tiles_y/2);
                            tiles.push({'all':tiles_x * tiles_y,
                                        'x':tiles_x
                                       });
                        }
                        tiles.push({all:1,x:1}); //z=0
                        tiles = tiles.reverse();

                        self.openlayers.graphic.getURL = function(bounds) {
                            var res = this.map.getResolution();
                            var x = Math.round((bounds.left - this.maxExtent.left) 
                                               / (res * this.tileSize.w));
                            var y = Math.round((this.maxExtent.top - bounds.top) 
                                               / (res * this.tileSize.h));
                            var z = this.map.getZoom();
                            var limit = Math.pow(2, z);
                            var url = this.url;
                            ///BEGIN different from XYZ.js
                            var tile_sum = tiles[z].x * y + x;
                            for (var i=0;i<z;i++) {
                                tile_sum += tiles[i].all;
                            }
                            var tilegroup = Math.floor(tile_sum/256);
                            if (tilegroup) {
                                url = url.replace(/TileGroup\d/,'TileGroup'+tilegroup);
                            }
                            ///END different from XYZ.js                            
                            var path = OpenLayers.String.format(url,{'x': x, 'y': y, 'z': z});
                            return path;
                        }
                    }
		} else {
		    var o2b = self.openlayers.object2bounds;
		    var bounds = o2b(create_obj.object);
		    ///TODO: if no create_obj.object.width, test with createElement('img')
		    var dim = self.openlayers.object_proportioned(create_obj.object);

		    objopt.maxExtent = o2b(create_obj.object);
		    self.openlayers.graphic = new OpenLayers.Layer.Image(
			create_obj.object.title||'Image',
			create_obj.object.image,//url of image
			bounds,
			//just proportional size: probably much smaller than the actual image
			///this allows us to 'zoom out' to smaller than actual image size
			new OpenLayers.Size(dim.w, dim.h),
			objopt
		    );
		}

		var projection = 'Flatland:1';//also 'EPSG:4326' and Spherical Mercator='EPSG:900913'
		self.openlayers.vectors = new OpenLayers.Layer.Vector("Vector Layer",
								      {projection:projection

								      }
								     );
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

		//DEBUG
		self.openlayers.map.addControl(new OpenLayers.Control.MousePosition());

		self.openlayers.map.addLayers([self.openlayers.graphic, self.openlayers.vectors]);

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

	this.queryformat = {
	    find:function(str) {
		return [];
	    },
	    read:function(found_obj) {
	    }
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