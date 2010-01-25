/*
  Support for the YouTube js-enabled player.  documentation at:
  http://code.google.com/apis/youtube/js_api_reference.html
  http://code.google.com/apis/youtube/chromeless_example_1.html
 */

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.YouTube && Sherd.Video.Base) {
    Sherd.Video.YouTube = function() {
        var self = this;
        
        Sherd.Video.Base.apply(this,arguments); //inherit -- video.js -- base.js
                
        // Note: not currently in use
        this.microformat.type = function() { return 'youtube'; };
        
        // create == asset->{html+information to make it}
        this.microformat.create = function(obj,doc) {
            var wrapperId = Sherd.Base.newID('youtube-wrapper');
            var playerId = Sherd.Base.newID('youtube-player-');
            var autoplay = obj.autoplay ? 1 : 0;
            self._ready = false;
            
            if (!obj.options) 
            {
                obj.options = {
                    width: obj.presentation == 'small' ? 310 : 620, // youtube default
                    height: obj.presentation == 'small' ? 220 : 440, // youtube default
                };
            }

            return {
                object: obj,
                htmlID: wrapperId,
                mediaId: playerId, // Used by microformat.components initialization
                autoplay: autoplay, // Used later by _seek seeking behavior
                youtube: obj.youtube, // Used by _seek seeking behavior
                text: '<div id="' + wrapperId + '" class="sherd-youtube-wrapper">' + 
                      '  <object width="' + obj.options.width + '" height="' + obj.options.height + '">' + 
                        '  <param name="movie" value="' + obj.youtube + '&enablejsapi=1&playerapiid=' + playerId + '"></param>' + 
                        '  <param name="allowscriptaccess" value="always"></param>' + 
                        '  <param name="autoplay" value="' + autoplay + '"></param>' + 
                        '  <param name="width" value="' + obj.options.width + '"></param>' + 
                        '  <param name="height" value="' + obj.options.height + '"></param>' + 
                        '  <embed src="' + obj.youtube + '&enablejsapi=1&playerapiid=' + playerId + '"' + 
                        '    type="application/x-shockwave-flash"' + 
                        '    allowScriptAccess="always"' + 
                        '    autoplay="' + autoplay + '"' + 
                        '    width="' + obj.options.width + '" height="' + obj.options.height + '"' + 
                        '    id="' + playerId + '">' + 
                        '  </embed>' + 
                        '</object>' + 
                      '</div>'
            }
        }

        // Find the objects based on the individual player properties in the DOM
        // NOTE: Not currently in use. 
        this.microformat.find = function(html_dom) {
            var found = [];
            //SNOBBY:not embeds, since they're in objects--and not xhtml 'n' stuff
            var objects = html_dom.getElementsByTagName('object');
                      //function is case-insensitive in IE and FFox,at least
            for(var i=0; i<objects.length; i++) {
                if (objects[i].getAttribute('id').search('youtube-player') > -1)
                    found.push({'html':objects[i]});
            }
            return found;
        };
        
        // Return asset object description (parameters) in a serialized JSON format.
        // NOTE: Not currently in use. Will be used for things like printing, or spitting out a description.
        this.microformat.read = function(found_obj) {
            var obj = {};
            var params = found_obj.html.getElementsByTagName('param');
            for (var i=0;i<params.length;i++) {
                obj[params[i].getAttribute('name')] = params[i].getAttribute('value');
            }
            obj.url = obj.movie;
            obj.youtube = obj.movie;
            return obj;
        };
        
        // Post-create step. Overriding here to do a component create
        this.microformat.postcreate = function(create_obj, html_dom) {
            if (create_obj) {
                var top = document.getElementById(create_obj.htmlID);
                self.components = self.microformat.components(top,create_obj);
            }
        };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            // Replacing the 'url' within an existing YouTube player requires decisions on  
            // autoplay, starttime, etc. As this is more a function for .media, I'm punting
            // for the moment on the update thread and allowing it to fall through to create. 
            return false;
        };
        
        // self.components -- Access to the internal player and any options needed at runtime
        this.microformat.components = function(html_dom,create_obj) {
            try {
                var rv = {};
                if (html_dom) {
                    rv.wrapper = html_dom;
                }
                if (create_obj) {
                    //the first works for everyone except safari
                    //the latter probably works everywhere except IE
                    rv.media = document[create_obj.mediaId] || document.getElementById(create_obj.mediaId);
                    rv.autoplay = create_obj.autoplay;
                    rv.youtube = create_obj.youtube;
                    rv.mediaId = create_obj.mediaId;
                }
                return rv;
            } catch(e) {}
            return false;
        };
        
        // Global function required for the player
        window.onYouTubePlayerReady = function(playerId) {
            if (playerId == self.components.mediaId) {
                self._ready = true;
                
                // reset the state
                self.setState({ start: self.components.starttime, end: self.components.endtime});
                
                // register a state change function
                // @todo -- YouTube limitation does not allow anonymous functions. Will need to address for 
                // multiple YT players on a page
                self.components.media.addEventListener("onStateChange", 'onYTStateChange');
                
                // let everyone know that the player is ready
            }
        }

        // This event is fired whenever the player's state changes. Possible values are unstarted 
        // (-1), ended (0), playing (1), paused (2), buffering (3), video cued (5). When the SWF is first loaded 
        // it will broadcast an unstarted (-1) event. 
        // When the video is cued and ready to play it will broadcast a video cued event (5).
        // 
        // @todo -- onYTStateChange does not pass the playerId into the function, which will be 
        // a problem if we ever have multiple players on the page
        window.onYTStateChange = function(newState) {
            log('window.onYTStateChange: ' + newState);
            
            if (newState == 1) {
                // @todo if the duration is good now, then broadcast a "valid metadata" event
            } else if (newState == 2 || newState == 0) {
                // @todo kill any end timers
            }
        };
        
        this.media.ready = function() {
            return self._ready;
        }
        
        this.media.movscale = 1; //movscale is a remnant from QT. vitalwrapper.js uses it. TODO: verify we need it.
       
        this.media.timestrip = function() {
            return {w: self.components.media.width,
                trackX: 42,
                trackWidth: 384,
                visible:true
            };
        }

        this.media.play = function() {
            if (self.components.media) {
                self.components.media.playVideo();
            }
        }
        
        this.media.duration = function() {
            duration = 0;
            if (self.components.media) {
                try {
                    duration = self.components.media.getDuration();
                    if (duration < 0)
                        duration = 0
                } catch(e) {
                    // media probably not yet initialized
                }
            }
            return duration;
        }
        
        this.media.time = function() {
            time = 0;
            if (self.components.media) {
                try {
                    time = self.components.media.getCurrentTime();
                    if (time < 0)
                        time = 0
                } catch (e) {
                    // media probably not yet initialized
                }
            }
            return time;
        }

        this.media.seek = function(starttime, endtime) {
            if (self.media.ready()) {
                if (starttime) {
                    if (self.components.autoplay) {
                        self.components.media.loadVideoByUrl(self.components.youtube, starttime);
                    }
                    else {
                        self.components.media.cueVideoByUrl(self.components.youtube, starttime);
                    }
                }
            
                if (endtime) {
                    // Watch the video's running time & stop it when the endtime rolls around
                    this.pauseAt(endtime);
                }
                
                // clear any saved values if they exist
                delete self.components.starttime;
                delete self.components.endtime;
            } else {
                // store the values away for when the player is ready
                self.components.starttime = starttime;
                self.components.endtime = endtime;
            }
        }
        
        this.media.pause = function() {
            if (self.components.media) {
                self.components.media.pauseVideo();
            }
        }

        this.media.pauseAt = function(endtime) {
            if (endtime) {
                self.events.queue('pause',[
                                          {test: function() { return self.media.time() >= endtime}, poll:500},
                                          {call: function() { self.media.pause(); }}
                                          ]);
            }
        }
    }
}