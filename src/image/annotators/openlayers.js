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
	this.setState = function(obj){
	    
	};

	this.initialize = function() {
	    self.openlayers.editingtoolbar = new self.openlayers.CustomEditingToolbar(
		self.targetview.openlayers.vectors
	    );
	    self.targetview.openlayers.map.addControl(self.openlayers.editingtoolbar);

	    //on creation of an annotation
	    self.openlayers.editingtoolbar.featureAdded = function(feature) {
		//because only one annotation is allowed at once.
		self.openlayers.editingtoolbar.deactivate();
		var geojson = self.targetview.openlayers.feature2json(feature);
		self.storage.update(geojson,true);
	    }
	    ///# 3. button to redraw

	}
	this.openlayers = {
	    CustomEditingToolbar :OpenLayers.Class(
		OpenLayers.Control.EditingToolbar, {
		    initialize: function(layer, options) {
			//copied, just removing Path
			var self = this;
			OpenLayers.Control.Panel.prototype.initialize.apply(this, [options]);
			this.sherd = {};
			this.sherd.navigation = new OpenLayers.Control.Navigation();
			///NEEDS MORE WORK, SO it's a BOX
			//new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.Box, {'displayClass': 'olControlNavToolbar'}),
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
			function featureAdded() {
			    if (typeof self.featureAdded=='function') {
				self.featureAdded.apply(self,arguments);
			    }
			}
			this.sherd.pointHandler.featureAdded = featureAdded;
			this.sherd.polygonHandler.featureAdded = featureAdded;
			this.addControls([ this.sherd.navigation ]);
			this.addControls([this.sherd.pointHandler, this.sherd.polygonHandler]);
		    }
		})
	};//end this.openlayers
	    
	this.storage = {
	    'update':function(obj,just_downstream){
		for (var i=0;i<self.targetstorage.length;i++) {
		    self.targetstorage[i].storage.update(obj);
		}
	    }
	}
	this.queryformat = {
	    find:function(str) {
		return [];
	    },
	    read:function(found_obj) {

	    }
	}
	this.microformat = {
	    'create':function(){
		var id = Sherd.Base.newID('openlayers-annotator');
		return {
		    htmlID:id,
		    text:'<div id="'+id+'"><button class="sherd-image-center">Center Annotation</button> <button class="sherd-image-redo">Redo Annotation</button></div>'
		};
	    },
	    'components':function(html_dom,create_obj) {
		var buttons = html_dom.getElementsByTagName('button');
		return {
		    'top':html_dom,
		    'center':buttons[0],
		    'redo':buttons[1]
		}
	    }
	}
    }//END Sherd.Image.Annotators.OpenLayers
}//END if (!Sherd.Image.Annotators.OpenLayers)


