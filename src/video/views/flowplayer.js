/* 
 * Using Flowplayer to support the flash video and mp4 formats
 * Support for the Flowplayer js-enabled player.  documentation at:
 * http://flowplayer.org/doc    umentation/api/index.html
 */

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.Flowplayer && Sherd.Video.Base) {
    Sherd.Video.Flowplayer = function() {
        var self = this;
        
        Sherd.Video.Base.apply(this,arguments); // inherit -- video.js -- base.js
        
        // Note: not currently in use
        this.microformat.type = function() { return 'flowplayer'; };
        this.microformat.supports = function() { return [ 'flv', 'flv_pseudo', 'mp4', 'mp4_pseudo']; }
        
        // create == asset->{html+information to make it}
        // setup the flowplayer div. will be replaced on write using the flowplayer API
        this.microformat.create = function(obj,doc) {
            var wrapperId = Sherd.Base.newID('flowplayer-wrapper-');
            var playerId = Sherd.Base.newID('flowplayer-player-');
            var url = '';
            var pseudo = 0;
                        
            if (obj.flv) {
                url = obj.flv;
            } else if (obj.flv_pseudo) {
                url = obj.flv_pseudo;
                pseudo = 1;
            } else if (obj.mp4) {
                url = obj.mp4;
            } else if (obj.mp4_pseudo) {
                url = obj.mp4_pseudo;
                pseudo = 1;
            }
            
            if (!obj.options) {
                obj.options = {
                    width: obj.presentation == 'small' ? 310 : 620, 
                    height: obj.presentation == 'small' ? 220 : 440, 
                };
            }
            
            return {
                object: obj,
                htmlID: wrapperId,
                mediaID: playerId, // Used by .write post initialization
                pseudostreaming: pseudo, // Used by .write post initialization
                text: '<div id="' + wrapperId + '" class="sherd-flowplayer-wrapper">' + 
                      '   <a href="' + url + '" style="display:block; width:' + obj.options.width + 'px;' + 
                          'height:' + obj.options.height + 'px;" id="' + playerId + '">' +  
                      '   </a>' + 
                      '</div>'
            }
        }
        
        // Post-create step. Overriding here to do a component create using the Flowplayer API
        this.microformat.write = function(create_obj,html_dom) {
            if (create_obj && create_obj.text) {
                html_dom.innerHTML = create_obj.text;
                
                options = {
                        clip: {
                            autoPlay: create_obj.object.autoplay ? true : false,
                            autoBuffering: true,
                        },
                        onSeek: function() { state = self.components.media.getState(); },
                        onStart: function() {
                            if (self.components.media && self.components.starttime > 0) {
                                self.events.queue('seek',[
                                                          {test: function() {
                                                                    return self.components.media.isLoaded(); 
                                                                 }, 
                                                              poll:500
                                                          },
                                                          {call: function() { self.components.media.seek(self.components.starttime); }},
                                                          {timeout: 2200}, //timeout to avoid seek competition
                                                          ]);
                            }
                            
                            // Watch the video's running time & stop it when the endtime rolls around
                            self.media.pauseAt(self.components.endtime);
                       },
                   };
                
                if (create_obj.pseudostreaming) {
                    options.plugins = { pseudo: { url: 'flowplayer.pseudostreaming-3.1.3.swf' } } 
                    options.clip.provider = "pseudo";
                }
                
                flowplayer(create_obj.mediaID, 
                           "http://releases.flowplayer.org/swf/flowplayer-3.1.5.swf",
                           options);
                
                var top = document.getElementById(create_obj.htmlID);
                self.components = self.microformat.components(top,create_obj);
            }
        }
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            // @todo. maybe.
            return false;
        };
        
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
                if (objects[i].getAttribute('id').search('flowplayer-player'))
                    found.push({'html':objects[i]});
            }
            return found;
        };
        
        // Return asset object description (parameters) in a serialized JSON format.
        // NOTE: Not currently in use. Will be used for things like printing, or spitting out a description.
        // Should be tested when we get there.
        this.microformat.read = function(found_obj) {
            var obj = {};
            var params = found_obj.html.getElementsByTagName('param');
            for (var i=0;i<params.length;i++) {
                obj[params[i].getAttribute('name')] = params[i].getAttribute('value');
            }
            return obj;
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
                    rv.media = $f(create_obj.mediaID); 
                    rv.starttime = 0;
                    rv.endtime = 0;
                }
                return rv;
            } catch(e) {}
            return false;
        };
        
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
                self.components.media.play();
            }
        }
        
        this.media.duration = function() {
            duration = 0;
            if (self.components.media && self.components.media.isLoaded()) {
                if (self.components.media.getClip().fullDuration)
                    duration = self.components.media.getClip().fullDuration;
            }
            return duration;
        }
        
        this.media.time = function() {
            time = 0;
            if (self.components.media && self.components.media.getState() == 3) {
                time = self.components.media.getTime();
                if (time < 1)
                    time = 0;
            }
            return time;
        }
        
        this.media.seek = function(starttime, endtime) {
            self.components.starttime = starttime;
            self.components.endtime = endtime;
        }
        
        this.media.pause = function() {
            if (self.components.media) {
                self.components.media.pause();
            }
        }
        
        // Watch the Flowplayer's timer and stop when the endtime rolls around
        // Using this method over the Flowplayer's specific "duration" function
        // as the duration cuts the end of the movie in the player, so you can't see
        // the whole thing. Would be great clip functionality, but not for us.
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
