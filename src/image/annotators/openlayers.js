if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.Annotators) {Sherd.Image.Annotators= {};}
if (!Sherd.Image.Annotators.OpenLayers) {
    Sherd.Image.Annotators.OpenLayers = function() {
	var self = this;
	Sherd.Base.AssetView.apply(this,arguments);//inherit

	this.attachView = function(view) {
	    self.targetview = view;
	};
	this.targetstorage = [];
	this.addStorage = function(stor) {
	    this.targetstorage.push(stor);
	};

	this.getState = function() {
	    return {};
	};

	var mode = 'create';//||'browse'||'edit'||'copy'
	this.setState = function(obj){
	    if (typeof obj=='object') {
		//because only one annotation is allowed at once.
                ///At the moment, we could do a better job of saving 'all' features
                /// in an annotation rather than overwriting with the last one
                /// but then we run into confusion where people think they're making
                /// a lot of annotations, but really made one.
	        mode = obj.mode || 'browse';
	        
	        if (self.openlayers.editingtoolbar) {
	            if (!obj.mode) {
	                self.openlayers.editingtoolbar.deactivate();
                    if (self.components.center)
                        self.components.center.style.display = 'none';
                    if (self.components.instructions)
                        self.components.instructions.style.display = 'none';
	            } if (obj.mode == 'browse') {
        	        self.openlayers.editingtoolbar.deactivate();
                    if (self.components.center)
                        self.components.center.style.display = 'inline';
                    if (self.components.instructions)
                        self.components.instructions.style.display = 'none';
        	    } else {
        	        self.openlayers.editingtoolbar.activate();
        	        if (self.components.center)
                        self.components.center.style.display = 'inline';
                    if (self.components.instructions)
                        self.components.instructions.style.display = 'block';
        	    }
	        }
	    }
	};

	this.initialize = function(create_obj) {
	    if (!self.openlayers.editingtoolbar) {
	        self.openlayers.editingtoolbar = new self.openlayers.CustomEditingToolbar(
	                self.targetview.openlayers.vectorLayer.getLayer()
	        );
	        self.targetview.openlayers.map.addControl(self.openlayers.editingtoolbar);
	        self.openlayers.editingtoolbar.deactivate();
    	    
	        //Q: this doubles mousewheel listening, e.g. why did we need it?
    	    //A: needed for not showing toolbar until clicking on an annotation
    	    //self.openlayers.editingtoolbar.sherd.navigation.activate();
    	    //Solution: just send signals or whatever.
	        OpenLayers.Control.prototype.activate.call(
	            self.openlayers.editingtoolbar.sherd.navigation
	        );
	    }
	    
        //on creation of an annotation
        self.openlayers.editingtoolbar.featureAdded = function(feature) {
                var current_state = self.targetview.getState();
                var geojson = self.targetview.openlayers.feature2json(feature);
                //copy feature properties to current_state
                for (var a in geojson) { current_state[a] = geojson[a]; }
                //use geojson object as annotation
                geojson.preserveCurrentFocus = true;
                self.targetview.setState(geojson);
                self.storage.update(current_state);
        };
	    
        /// button listeners
        self.events.connect(self.components.center,'click',function(evt) {
            self.targetview.setState({feature:self.targetview.currentfeature});
        });
	};
	this.openlayers = {
	    CustomEditingToolbar :OpenLayers.Class(
		OpenLayers.Control.EditingToolbar, {
		    initialize: function(layer, options) {
			//copied, just removing Path-drawing
			var self = this;
			OpenLayers.Control.Panel.prototype.initialize.apply(this, [options]);
			//keep our own stuff contained;
			this.sherd = {};
			this.sherd.navigation = new OpenLayers.Control.Navigation({autoActivate:true});
			this.sherd.pointHandler = new OpenLayers.Control.DrawFeature(
			    layer, 
			    OpenLayers.Handler.Point, 
			    {'displayClass':'olControlDrawFeaturePoint'}
			);
			this.sherd.polygonHandler = new OpenLayers.Control.DrawFeature(
			    layer, 
			    OpenLayers.Handler.Polygon, 
			    {'displayClass': 'olControlDrawFeaturePolygon'}
			);
	                this.sherd.squareHandler = new OpenLayers.Control.DrawFeature(
			    layer, 
			    OpenLayers.Handler.RegularPolygon, 
			    {'displayClass': 'olControlDrawFeatureSquare',
                             /*note, this is not supported by openlayers--we need to make our own icons*/
                             'handlerOptions':{sides:4,irregular:true}
                            }
			);
			function featureAdded() {
			    if (typeof self.featureAdded=='function') {
				self.featureAdded.apply(self,arguments);
			    }
			}
			this.sherd.pointHandler.featureAdded = featureAdded;
			this.sherd.polygonHandler.featureAdded = featureAdded;
			this.sherd.squareHandler.featureAdded = featureAdded;
			this.addControls([this.sherd.navigation,
					  this.sherd.pointHandler, 
					  this.sherd.squareHandler,
					  this.sherd.polygonHandler
                                         ]);
		    }
		})
	};//end this.openlayers
	    
	this.storage = {
	    'update':function(obj,just_downstream) {
    	    if (!just_downstream) {
    	        self.setState(obj);
    	    } 
    	    for (var i=0;i<self.targetstorage.length;i++) {
    	        self.targetstorage[i].storage.update(obj);
    	    }
	}
	};

    this.microformat = {
	    'create':function(){
		var id = Sherd.Base.newID('openlayers-annotator');
		return {
		    htmlID:id,
		    text:'<div id="'+id+'" class="sherd-image-annotator"><button style="display:none;" class="sherd-image-center">Center Annotation</button> <p style="display:none;" class="sherd-image-instructions sherd-instructions">Choose a drawing tool. The polygon tool works by clicking on the points of the polygon and then double-clicking the last point.</p></div>'
		};
	    },
	    'components':function(html_dom,create_obj) {
		var buttons = html_dom.getElementsByTagName('button');
		return {
		    'top':html_dom,
		    'center':buttons[0],
            'instructions':html_dom.getElementsByTagName('p')[0]
		};
	    }
	};
    };//END Sherd.Image.Annotators.OpenLayers
}//END if (!Sherd.Image.Annotators.OpenLayers)


