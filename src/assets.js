// 

if (typeof Sherd == 'undefined') {
    Sherd = {};
}

// TODO used?
if (!Sherd.AssetLayer) {
    Sherd.AssetLayer = function() {

    };// AssetLayer
}

// GenericAssetView -- contains the pointer functions for displaying all types of media
// Each media type identifies a "view" to display the media
// And a clipForm that controls how the media is annotated
if (!Sherd.GenericAssetView) {
    // CONSTRUCTOR
    Sherd.GenericAssetView = function(options) {
        var self = this;
        //consts
        var Clipstripper = Sherd.Video.Annotators.ClipStrip;
        var Clipformer = DjangoSherd_ClipForm;
	this.options = options;
        // //INIT
        this.settings = {};
        if (Sherd.Video && Sherd.Video.QuickTime) {
            var quicktime = {
                'view' : new Sherd.Video.QuickTime()
            };
            if (options.clipform) {
                quicktime.clipform = new Clipformer();// see clipform.js
                quicktime.clipform.attachView(quicktime.view);
                if (options.storage) {
                    quicktime.clipform.addStorage(options.storage);
                }
            }
            if (options.clipstrip) {
                quicktime.clipstrip = new Clipstripper();
                quicktime.clipstrip.attachView(quicktime.view);
            }
            this.settings.quicktime = quicktime;
        }
        if (Sherd.Video && Sherd.Video.YouTube) {
            var youtube = {
                'view' : new Sherd.Video.YouTube()
            };
            if (options.clipform) {
                youtube.clipform = new Clipformer();// see clipform.js
                youtube.clipform.attachView(youtube.view);
                if (options.storage) {
                    youtube.clipform.addStorage(options.storage);
                }
            }
            if (options.clipstrip) {
                youtube.clipstrip = new Clipstripper();
                youtube.clipstrip.attachView(youtube.view);
            }
            this.settings.youtube = youtube;
        }
        if (Sherd.Video && Sherd.Video.Flowplayer) {
            var flowplayer = {
                'view' : new Sherd.Video.Flowplayer()
            };
            if (options.clipform) {
                flowplayer.clipform = new Clipformer(); // see clipform.js
                flowplayer.clipform.attachView(flowplayer.view);
                if (options.storage) {
                    flowplayer.clipform.addStorage(options.storage);
                }
            }
            if (options.clipstrip) {
                flowplayer.clipstrip = new Clipstripper();
                flowplayer.clipstrip.attachView(flowplayer.view);
            }
            this.settings.flowplayer = flowplayer;
        }
        if (Sherd.Image && Sherd.Image.OpenLayers) {
            var image = {
                'view' : new Sherd.Image.OpenLayers()
            };
            if (options.clipform) {
                image.clipform = new Sherd.Image.Annotators.OpenLayers();
                image.clipform.attachView(image.view);
                if (options.storage) {
                    image.clipform.addStorage(options.storage);
                }
            }
            this.settings.image = image;
        }
        if (Sherd.Image && Sherd.Image.FSIViewer) {
            var fsi = {
                'view' : new Sherd.Image.FSIViewer()
            };
            if (options.clipform) {
                fsi.clipform = new Sherd.Image.Annotators.FSIViewer();
                fsi.clipform.attachView(fsi.view);
                if (options.storage) {
                    fsi.clipform.addStorage(options.storage);
                }
            }
            this.settings.fsiviewer = fsi;
        }
        // //API
        var current_type = false;
        this.html = {
            remove : function() {
                if (current_type) {
                    self.settings[current_type].view.html.remove();
                    if (self.clipstrip) {
                        self.clipstrip.html.remove();
                    }
                    current_type = false;
                }
            },
            push : function(html_dom, options) {
                if (options.asset && options.asset.type
                        && (options.asset.type in self.settings)) {
                    
                    if (current_type) {
                        if (current_type != options.asset.type) {
                            self.html.remove();
                        }
                    }
                    
                    current_type = options.asset.type;
                    
                    // /the main pass
                    var cur = self.settings[current_type];
                    cur.view.html.push(html_dom,options);

                    if (cur.clipform) {
                        self.clipform = cur.clipform;
                    }
                    if (cur.clipstrip) {
			var target = 'clipstrip-display';//default
			if (options.targets && options.targets.clipstrip) {
			    target = options.targets.clipstrip;
			} else if (self.options.targets 
				   && self.options.targets.clipstrip) {
			    target = self.options.targets.clipstrip;
			}
                        cur.clipstrip.html.push(target, {
                            asset : {}
                        });
                        self.clipstrip = cur.clipstrip;
                    }
                } else {
                    if (window.console) {
                        console.log(options);
                    }
                    throw Error("Your asset does not have a (supported) type marked.");
                }
            }
        }
        this.setState = function() {
            if (current_type) {
                var cur = self.settings[current_type];
                //special JS magic -- set this == view
                cur.view.setState.apply(cur.view, arguments);
                if (self.clipstrip) {
                    self.clipstrip.setState.apply(self.clipstrip,arguments);
                }
            }
        }
        this.getState = function() {
            if (current_type) {
                return self.settings[current_type].view.getState.apply(
                        self.settings[current_type].view, arguments//special JS magic -- this == view
                        );
            }
        }
        this.queryformat = {
            find:function(str) {
                if (self.settings[current_type].view.queryformat
                    && self.settings[current_type].view.queryformat.find) {
                    return self.settings[current_type].view.queryformat.find(str);
                } else {
                    return [];
                }
            }
        }
    }//GenericAssetView
}
