/*
Documentation:

  SERIALIZATION of asset
       {url:''
	,width:320
	,height:260
	,autoplay:'false'
	,controller:'true'
	,errortext:'Error text.'
	,type:'video/ogg'
	};
 */
if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.Videotag && Sherd.Video.Base) {
    Sherd.Video.Videotag = function() {
        var self = this;
        Sherd.Video.Base.apply(this,arguments); //inherit off video.js - base.js
        
        ////////////////////////////////////////////////////////////////////////
        // Microformat
        this.microformat.create = function(obj,doc) {
            var wrapperID = Sherd.Base.newID('videotag-wrapper-');
            var playerID = Sherd.Base.newID('videotag-player-');
            var controllerID = Sherd.Base.newID('videotag-controller-');
            var console = 'Console'+playerID;
            
            if (!obj.options) {
                obj.options = {
                    width: (obj.presentation == 'small' ? 320 : (obj.width||480)), 
                    height: (obj.presentation == 'small' ? 240 : (obj.height||360)) 
                };
            }
            
            var create_obj = {
                object: obj,
                htmlID: wrapperID,
                playerID: playerID, // Used by .initialize post initialization
                text: '<div id="' + wrapperID + '" class="sherd-flowplayer-wrapper" '
                    + '     style="width:'+obj.options.width+'px">' 
                    + '<video id="'+playerID+'" controls="controls"'
                    + '        height="'+obj.options.height+'" width="'+obj.options.width+'"'
		    + '        src="'+ obj.ogg +'">'
                    + '</video>'
                    + '</div>'
            }
            return create_obj;
        };
        
        this.microformat.components = function(html_dom,create_obj) {
            try {
                var rv = {};
                if (html_dom) {
                    rv.wrapper = html_dom;
                }
                if (create_obj) {
		    rv.player = html_dom.getElementsByTagName('video');
                    rv.width = (create_obj.options && create_obj.options.width) || rv.player.offsetWidth;
                    rv.mediaUrl = create_obj.ogg;
                } 
                return rv;
            } catch(e) {}
            return false;
        };
        
        // Find the objects based on the individual player properties in the DOM
        // Works in conjunction with read
        this.microformat.find = function(html_dom) {
            throw Error("unimplemented");
            var found = [];
            return found;
        };
        
        // Return asset object description (parameters) in a serialized JSON format.
        // Will be used for things like printing, or spitting out a description.
        // works in conjunction with find
        this.microformat.read = function(found_obj) {
            throw Error("unimplemented");
            var obj = {};
            return obj;
        };

        this.microformat.type = function() { return 'videotag'; };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            return false;
            if (obj.ogg && self.components.player && self.media.ready()) {
                try {
		    self.components.player.src = obj.ogg;
		    self.components.mediaUrl = obj.ogg;
                    return true;
                } catch(e) { }
            }
            return false;
        }
        
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        
        this.initialize = function(create_obj) {
            self.events.connect(djangosherd, 'seek', self.media, 'seek');
            self.events.connect(djangosherd, 'playclip', function(obj) {
                    self.setState(obj);
                    self.media.play();
                });

        };
        
        // Overriding video.js
        this.deinitialize = function() {
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific
        
        this.media.duration = function() {
            var duration = 0;
            return duration;
        };
        
        this.media.pause = function() {
        };
        
        this.media.play = function() {
        };
        
        // Used by tests
        this.media.isPlaying = function() {
            return false;
        };
        
        this.media.ready = function() {
	    return true;
        };

        this.media.seek = function(starttime, endtime) {
        }
        
        this.media.time = function() {
            return 0;
        }
        
        this.media.timescale = function() {
            return 1;
        }
        
        this.media.timestrip = function() {
            var w = self.components.player.width;
            return {w: w,
                trackX: 110,
                trackWidth: w-220,
                visible:true
            }
        }
        
        //returns true, if we're sure it is. Not currently used
        this.media.isStreaming = function() {
            return false;
        };

        // Used by tests.
        this.media.url = function() {
            return self.components.mediaUrl;
        }
        
    } //Sherd.Video.Videotag

}