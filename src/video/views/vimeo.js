/*
  Support for the Vimeo js-enabled player.  documentation at:
  http://vimeo.com/api/docs/oembed
  http://http://vimeo.com/api/docs/player-js
 
  Signals:
  duration: signals duration change
  
  Listens For:
  seek: seek to a particular starttime
 */

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.Vimeo && Sherd.Video.Base) {
    Sherd.Video.Vimeo = function() {
        var self = this;
        
        Sherd.Video.Base.apply(this,arguments); //inherit -- video.js -- base.js
        
        this.state = {
                starttime:0,
                endtime:0,
                seeking: false
            };
        
        this.presentations = {
            'small':{
                width:function(){return 310;},
                height:function(){return 220;}
            },
            'medium': {
                width:function(){return 540;},
                height:function(){return 383;}
            },
            'default': {
                width:function(){return 620;},
                height:function(){return 440;}
            }
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Microformat
        
        // create == asset->{html+information to make it}
        this.microformat.create = function(obj) {
            var wrapperID = Sherd.Base.newID('vimeo-wrapper-');
            var playerID = Sherd.Base.newID('vimeo_player_');
            var autoplay = obj.autoplay ? 1 : 0;
            self.media._ready = false;
            
            if (!obj.options) {
                var presentation;
                switch (typeof obj.presentation) {
                    case 'string': presentation = self.presentations[obj.presentation]; break;
                    case 'object': presentation = obj.presentation; break;
                    case 'undefined': presentation = self.presentations['default']; break;
                }
                
                obj.options = {
                    width: presentation.width(),
                    height: presentation.height()
                };
            }

            return {
                options: obj.options,
                htmlID: wrapperID,
                playerID: playerID,
                autoplay: autoplay, // Used later by _seek seeking behavior
                mediaUrl: obj.vimeo, // Used by _seek seeking behavior
                text: '<div id="' + wrapperID + '" class="sherd-vimeo-wrapper"></div>' 
            };
        };
        
        // self.components -- Access to the internal player and any options needed at runtime
        this.microformat.components = function(html_dom,create_obj) {
            try {
                var rv = {};
                if (html_dom) {
                    rv.wrapper = html_dom;
                }
                if (create_obj) {
                    rv.autoplay = create_obj.autoplay;
                    rv.mediaUrl = create_obj.mediaUrl;
                    rv.playerID = create_obj.playerID;
                    rv.width = create_obj.options.width;
                    rv.height = create_obj.options.height;
                }
                return rv;
            } catch(e) {}
            return false;
        };

        // Return asset object description (parameters) in a serialized JSON format.
        // NOTE: Not currently in use. Will be used for things like printing, or spitting out a description.
        this.microformat.read = function(found_obj) {
            var obj = {};
            var params = found_obj.html.getElementsByTagName('param');
            for (var i=0;i<params.length;i++) {
                obj[params[i].getAttribute('name')] = params[i].getAttribute('value');
            }
            obj.mediaUrl = obj.movie;
            return obj;
        };
        
        this.microformat.type = function() { return 'vimeo'; };
        
        this.microformat.update = function(obj,html_dom) {
            return obj.vimeo == self.components.mediaUrl && document.getElementById(self.components.playerID) && self.media.ready();
        };
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides

        window.vimeo_player_progress = function(seconds) {
            if (self.state.seeking == true && seconds > 0.5) {
                self.state.seeking = false;
                delete self.state.autoplay;
                
                if (self.state.starttime != undefined) {
                    self.components.player.api_seekTo(self.state.starttime);
                    delete self.state.starttime;
                }
                
                if (self.state.endtime != undefined) {
                    setTimeout(function() {
                        self.media.pauseAt(self.state.endtime);
                        delete self.state.endtime;
                    }, 200);
                }
            }
        }
        
        window.vimeo_player_loaded = function(playerID) {
            
            self.components.player = document.getElementById(self.components.playerID);
            self.components.player.api_addEventListener("playProgress", "vimeo_player_progress");
            
            // register for notifications from clipstrip to seek to various times in the video
            self.events.connect(self, 'seek', self.media.playAt);
            
            self.events.connect(self, 'playclip', function(obj) {
                self.setState(obj, { 'autoplay': true });
            });
            
            var duration = self.media.duration();
            if (duration > 1) {
                self.events.signal(self, 'duration', { duration: duration });
            }
            
            self.media._ready = true;
            
            // get out of the "loaded" function before seeking happens
            if (self.state.starttime != undefined)
                setTimeout(function() { self.media.seek(self.state.starttime, self.state.endtime, self.state.autoplay ); }, 100);
        }
        
        this.initialize = function(create_obj) {
            var params = { 
               width: create_obj.options.width,
               height: create_obj.options.height,
               autoplay: create_obj.autoplay,
               api: 1,
               js_api: 1,
               player_id: create_obj.playerID,
               iframe: false
            }

            var url = 'http://www.vimeo.com/api/oembed.json?callback=?&url=' + create_obj.mediaUrl;
            jQuery.getJSON(url, params, function(json) {
                var wrapper = document.getElementById(create_obj.htmlID); 
                wrapper.innerHTML = unescape(json.html);
                var swfobj = wrapper.childNodes[0];
                
                // For IE, the id needs to be placed in the object.
                // For FF, the id needs to be placed in the embed.
                if (window.navigator.userAgent.indexOf("MSIE") > -1) {
                    swfobj.id = create_obj.playerID;
                } else {
                    for (var i = 0; i < swfobj.childNodes.length; i++) {
                        if (swfobj.childNodes[i].nodeName == "EMBED") {
                            swfobj.childNodes[i].id = create_obj.playerID;
                        }
                     }
                }
            });
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific
        
        this.media.duration = function() {
            var duration = 0;
            if (self.components.player) {
                try {
                    duration = self.components.player.api_getDuration();
                    if (duration < 0)
                        duration = 0;
                } catch(e) {
                    // media probably not yet initialized
                }
            }
            return duration;
        };
        
        this.media.pause = function() {
            if (self.components.player) { 
                try {
                    self.components.player.api_pause();
                } catch (e) {}
            }
        };
        
        this.media.play = function() {
            if (self.media.ready) {
                try {
                    self.components.player.api_play();
                } catch (e) {}
            }
        };
        
        this.media.ready = function() {
            return self.media._ready;
        };
        
        this.media.isPlaying = function() {
            var playing = false;
            try {
                if (self.components.player)
                    playing = !self.components.player.api_paused();
            } catch(e) {}
            return playing;
        };

        this.media.seek = function(starttime, endtime, autoplay) {
            // this might need to be a timer to determine "when" the media player is ready
            // it's working differently from initial load to the update method
            if (!self.media.ready()) {
                // executes on player_ready
                self.state.starttime = starttime;
                self.state.endtime = endtime;   
                self.state.autoplay = autoplay;
            } else if (autoplay) {
                // executes on player_progress
                self.state.starttime = starttime;
                self.state.endtime = endtime;
                self.state.seeking = true;
                
                if (!self.media.isPlaying())
                    self.components.player.api_play();
            } else {
                // executes immediately
                if (starttime != undefined) {
                    self.components.player.api_seekTo(starttime);
                }
                
                if (endtime != undefined) {
                    setTimeout(function() {
                        self.media.pauseAt(endtime);
                    }, 200);
                }
                
                delete self.state.starttime;
                delete self.state.endtime;
                delete self.state.autoplay;
                self.state.seeking = false;
            }
        };
        
        this.media.time = function() {
            var time = 0;
            if (self.components.player) {
                try {
                    time = self.components.player.api_getCurrentTime();
                    if (time < 0)
                        time = 0;
                } catch (e) {
                    // media probably not yet initialized
                }
            }
            return time;
        };
        
        this.media.timestrip = function() {
            var w = self.components.width;
            return {
                w: w,
                trackX: 96,
                trackWidth: w-283,
                visible:true
            };
        };

        // Used by tests. Might be nice to refactor state out so that
        // there's a consistent interpretation across controls
        this.media.state = function() {
            return 0;
        };

        this.media.url = function() {
            return self.components.player.api_getVideoUrl();
        };
    };
}