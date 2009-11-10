if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.Annotators) {Sherd.Image.Annotators= {};}
if (!Sherd.Image.Annotators.OpenLayers) {
    Sherd.Image.Annotators.OpenLayers = function() {
	var self = this;
	Sherd.Base.AssetView.apply(this,arguments);//inherit


	///will this work?  this is all so hacky!
	this.attachView = function(view) {
	    //this.media = view.media; //WTF?!
	    this.targetview = view;
	}
	this.targetstorage = [];
	this.addStorage = function(stor) {
	    this.targetstorage.push(stor);
	}
	
	this.getState = function(){
	    return {};
	}
	this.setState = function(){}

	this.initialize = function() {

	}
	this.storage = {
	    'update':function(){}
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
		    text:'<div id="'+id+'">hello</div>'
		};
	    }
	}
    }//END Sherd.Image.Annotators.OpenLayers
}//END if (!Sherd.Image.Annotators.OpenLayers)


