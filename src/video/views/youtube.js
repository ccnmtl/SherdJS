/*
  Support for the YouTube js-enabled player.  documentation at:
  http://code.google.com/apis/youtube/js_api_reference.html
  http://code.google.com/apis/youtube/chromeless_example_1.html
 */

// global function required to catch YouTube player ready event
// also, the place to register for events and state changes.
// Currently, not utilizing either approach, opting for a timer instead.
function onYouTubePlayerReady(playerId) {
}

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
                mediaID: playerId, // Used by microformat.components initialization
                autoplay: autoplay, // Used later by _seek seeking behavior
                youtube: obj.youtube, // Used by _seek seeking behavior
                text: '<div id="' + wrapperId + '" class="sherd-youtube-wrapper">' + 
                      '  <object width="' + obj.options.width + '" height="' + obj.options.height + '">' + 
                        '  <param name="movie" value="' + obj.youtube + '&rel=0&enablejsapi=1&playerapiid=' + playerId + '"></param>' + 
                        '  <param name="allowscriptaccess" value="always"></param>' + 
                        '  <param name="autoplay" value="' + autoplay + '"></param>' + 
                        '  <param name="width" value="' + obj.options.width + '"></param>' + 
                        '  <param name="height" value="' + obj.options.height + '"></param>' + 
                        '  <embed src="' + obj.youtube + '&rel=0&enablejsapi=1&playerapiid=' + playerId + '"' + 
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
            var objects = ((html_dom.tagName.toLowerCase()=='object')
                    ? [html_dom] : html_dom.getElementsByTagName('object')
                      //function is case-insensitive in IE and FFox,at least
            );
            for(var i=0; i<objects.length; i++) {
                if (objects[i].getAttribute('id').search('youtube-player'))
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
        this.microformat.write = function(create_obj,html_dom) {
            if (create_obj && create_obj.text) {
                html_dom.innerHTML = create_obj.text;
                var top = document.getElementById(create_obj.htmlID);
                self.components = self.microformat.components(top,create_obj);
            }
        }
        
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
                    rv.media = document[create_obj.mediaID] || document.getElementById(create_obj.mediaID);
                    rv.autoplay = create_obj.autoplay;
                    rv.youtube = create_obj.youtube;
                }
                return rv;
            } catch(e) {}
            return false;
        };
        
        this.media._seek = function(starttime) {
            if (self.components.media) {
                if (self.components.autoplay) {
                    self.components.media.loadVideoByUrl(self.components.youtube, starttime);
                }
                else {
                    self.components.media.cueVideoByUrl(self.components.youtube, starttime);
                }
            }
        }
        
        this.media._test = function() {
            try {
                if (self.components.media) {
                    state = self.components.media.getPlayerState();
                    if (state)
                        return true;
                }
            }
            catch (e) {
            }
            return false;
        }
        
        this.media.movscale = 1; //movscale is a remnant from QT. vitalwrapper.js uses it. TODO: verify we need it.
       
        // NOTE: Copied from QT. Reimplement for clipstrip.
        this.media.timestrip = function() {
            return {w:25,
                x:(16*2),
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
            // Queue up a "_seek" call. The YT player is not yet ready
            self.events.queue('seek',[
                                      {test:self.media._test, poll:500},
                                      {data: starttime },
                                      {timeout: 2200}, //timeout to avoid seek competition
                                      {call: function() { self.media._seek(starttime); }}
                                      ]);
            
            // Watch the video's running time & stop it when the endtime rolls around
            this.pauseAt(endtime);
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