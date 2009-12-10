if (typeof Sherd == 'undefined') {Sherd = {};}
if (!Sherd.AssetLayer) {
    Sherd.AssetLayer = function(){
	
    };//AssetLayer
}
if (!Sherd.GenericAssetView) {
    Sherd.GenericAssetView = function(options) {
	var self = this;
	////INIT
	this.settings = {};
	if (Sherd.Video && Sherd.Video.QuickTime) {
	    var quicktime = {'view':new Sherd.Video.QuickTime()};
	    quicktime.view.id = function(){return 'movie1';}//hackity-hack
	    if (options.clipform) {
		quicktime.clipform = new DjangoSherd_ClipForm();//see vitalwrapper.js
		quicktime.clipform.attachView(quicktime.view);
		if (options.storage) {
		    quicktime.clipform.addStorage(options.storage);
		}
	    }
	    this.settings.quicktime = quicktime;
	}
	if (Sherd.Image && Sherd.Image.OpenLayers) {
	    var image = {'view':new Sherd.Image.OpenLayers()};
	    if (options.clipform) {
		image.clipform = new Sherd.Image.Annotators.OpenLayers();
		image.clipform.attachView(image.view);
		if (options.storage) {
		    image.clipform.addStorage(options.storage);
		}
	    }
	    this.settings.image = image;
	}
	////API
	var current_type = false;
	this.html = {
	    remove:function() {
		if (current_type) {
		    self.settings[current_type].view.html.remove();
		}
	    },
	    push:function(html_dom,options) {
		if (options.asset 
		    && options.asset.type
		    && (options.asset.type in self.settings)
		   ) {
		    if (current_type && current_type != options.asset.type) {
			self.settings[current_type].view.html.remove();
		    }
		    current_type = options.asset.type;
		    ///the main pass
		    self.settings[current_type].view.html.push(html_dom,options);
		    
		    if (self.settings[current_type].clipform) {
			self.clipform = self.settings[current_type].clipform;
		    }
		} else {
		    throw "Your asset does not have a (supported) type marked";
		}
	    }
	}
	this.setState = function() {
	    if (current_type) {
		self.settings[current_type].view.setState.apply(
		    self.settings[current_type].view,
		    arguments//special JS magic
		);
	    }
	}
	this.getState = function() {
	    if (current_type) {
		self.settings[current_type].view.getState.apply(
		    self.settings[current_type].view,
		    arguments//special JS magic
		);
	    }
	}
    }//GenericAssetView
}
