if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.Annotators) {Sherd.Image.Annotators= {};}
if (!Sherd.Image.Annotators.OpenLayers) {
    Sherd.Image.Annotators.OpenLayers = function() {
	var self = this;
	Sherd.Base.AssetView.apply(this,arguments);//inherit

	this.attachView = function(view) {
	    self.targetview = view;
	}
	this.targetstorage = [];
	this.addStorage = function(stor) {
	    this.targetstorage.push(stor);
	}

	this.getState = function(){
	    return {};
	}

	var mode = 'create';//||'browse'
	this.setState = function(obj){
	    if (typeof obj=='object') {
		//because only one annotation is allowed at once.
                ///At the moment, we could do a better job of saving 'all' features
                /// in an annotation rather than overwriting with the last one
                /// but then we run into confusion where people think they're making
                /// a lot of annotations, but really made one.
		self.openlayers.editingtoolbar.deactivate();

		///show buttons
		self.components.center.style.display = 'inline';
		self.components.redo.style.display = 'inline';
                self.components.instructions.style.display = 'none';
		mode = 'browse';
	    }
	};

	this.initialize = function(create_obj) {
	    self.openlayers.editingtoolbar = new self.openlayers.CustomEditingToolbar(
		self.targetview.openlayers.vectors
	    );
	    self.targetview.openlayers.map.addControl(self.openlayers.editingtoolbar);
	    //Q: this doubles mousewheel listening, e.g. why did we need it?
	    //A: needed for not showing toolbar until clicking 'redo annotation' on an annotation
	    //self.openlayers.editingtoolbar.sherd.navigation.activate();
	    //Solution: just send signals or whatever.
	    OpenLayers.Control.prototype.activate.call(
		self.openlayers.editingtoolbar.sherd.navigation
	    );

	    //on creation of an annotation
	    self.openlayers.editingtoolbar.featureAdded = function(feature) {
                var current_state = self.targetview.getState();
                var geojson = self.targetview.openlayers.feature2json(feature);
                for (a in geojson) {current_state[a] = geojson[a]};
		///this should probably be through a signal?
		self.targetview.setState({feature:feature,
					  preserveCurrentFocus:true
					 });
		self.storage.update(current_state);
	    }
	    ///# 3. button listeners
	    self.events.connect(self.components.center,'click',function(evt) {
		self.targetview.setState({feature:self.targetview.currentfeature});
	    });
	    self.events.connect(self.components.redo,'click',function(evt) {
		if (mode != 'create') {
		    mode = 'create';
		    self.openlayers.editingtoolbar.activate();
                    self.openlayers.editingtoolbar.sherd.squareHandler.activate();
		    ///visit current feature
		    //self.targetview.setState({feature:self.targetview.currentfeature});

		    //reset feature BAD BAD BAD (because we're not going through a function )
		    self.targetview.currentfeature = false;
		    //delete all (assumes only one annotation)
		    self.targetview.openlayers.vectors.removeFeatures(
			self.targetview.openlayers.vectors.features
		    );
                    self.components.instructions.style.display = 'inline';                    
		    self.components.center.style.display = 'none';
		    self.components.redo.style.display = 'none';
		}
	    });

	}
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
	    'update':function(obj,just_downstream){
		if (!just_downstream) {
		    self.setState(obj);
		}
		for (var i=0;i<self.targetstorage.length;i++) {
		    self.targetstorage[i].storage.update(obj);
		}
	    }
	}

 	this.microformat = {
	    'create':function(){
		var id = Sherd.Base.newID('openlayers-annotator');
		return {
		    htmlID:id,
		    text:'<div id="'+id+'" class="sherd-image-annotator"><button style="display:none;" class="sherd-image-center">Center Annotation</button> <button style="display:none;" class="sherd-image-redo">Redo Annotation</button><p class="sherd-image-instructions sherd-instructions">Choose a drawing tool.  The polygon tool works by clicking on the points of the polygon and then double-clicking the last point.</p></div>'
		};
	    },
	    'components':function(html_dom,create_obj) {
		var buttons = html_dom.getElementsByTagName('button');
		return {
		    'top':html_dom,
		    'center':buttons[0],
		    'redo':buttons[1],
                    'instructions':html_dom.getElementsByTagName('p')[0]
		}
	    }
	}
    }//END Sherd.Image.Annotators.OpenLayers
}//END if (!Sherd.Image.Annotators.OpenLayers)


