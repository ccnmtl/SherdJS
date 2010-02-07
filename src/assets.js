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
        // //INIT
        this.settings = {};
        if (Sherd.Video && Sherd.Video.QuickTime) {
            var quicktime = {
                'view' : new Sherd.Video.QuickTime()
            };
            if (options.clipform) {
                quicktime.clipform = new DjangoSherd_ClipForm();// see vitalwrapper.js
                quicktime.clipform.attachView(quicktime.view);
                if (options.storage) {
                    quicktime.clipform.addStorage(options.storage);
                }
            }
            if (options.clipstrip) {
                quicktime.clipstrip = new DjangoSherd_ClipStrip();
                quicktime.clipstrip.attachView(quicktime.view);
            }
            this.settings.quicktime = quicktime;
        }
        if (Sherd.Video && Sherd.Video.YouTube) {
            var youtube = {
                'view' : new Sherd.Video.YouTube()
            };
            if (options.clipform) {
                youtube.clipform = new DjangoSherd_ClipForm();// see vitalwrapper.js
                youtube.clipform.attachView(youtube.view);
                if (options.storage) {
                    youtube.clipform.addStorage(options.storage);
                }
            }
            if (options.clipstrip) {
                youtube.clipstrip = new DjangoSherd_ClipStrip();
                youtube.clipstrip.attachView(youtube.view);
            }
            this.settings.youtube = youtube;
        }
        if (Sherd.Video && Sherd.Video.Flowplayer) {
            var flowplayer = {
                'view' : new Sherd.Video.Flowplayer()
            };
            if (options.clipform) {
                flowplayer.clipform = new DjangoSherd_ClipForm(); // see vitalwrapper.js
                flowplayer.clipform.attachView(flowplayer.view);
                if (options.storage) {
                    flowplayer.clipform.addStorage(options.storage);
                }
            }
            if (options.clipstrip) {
                flowplayer.clipstrip = new DjangoSherd_ClipStrip();
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
        // //API
        var current_type = false;
        this.html = {
            remove : function() {
                if (current_type) {
                    self.settings[current_type].view.html.remove();
                    current_type = false;
                }
            },
            push : function(html_dom, options) {
                if (options.asset && options.asset.type
                        && (options.asset.type in self.settings)) {
                    
                    if (current_type) {
                        if (current_type != options.asset.type) {
                            self.settings[current_type].view.html.remove();
                        }
                    }
                    
                    current_type = options.asset.type;
                    
                    // /the main pass
                    self.settings[current_type].view.html.push(html_dom,
                            options);

                    if (self.settings[current_type].clipform) {
                        self.clipform = self.settings[current_type].clipform;
                    }
                    if (self.settings[current_type].clipstrip) {
                        self.clipstrip = self.settings[current_type].clipstrip;
                    }
                } else {
                    throw "Your asset does not have a (supported) type marked";
                }
            }
        }
        this.setState = function() {
            if (current_type) {
                self.settings[current_type].view.setState.apply(
                        self.settings[current_type].view, arguments //special JS magic -- this == view
                        );
            }
        }
        this.getState = function() {
            if (current_type) {
                return self.settings[current_type].view.getState.apply(
                        self.settings[current_type].view, arguments//special JS magic -- this == view
                        );
            }
        }
    }//GenericAssetView
}
