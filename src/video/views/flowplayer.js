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
        
        ////////////////////////////////////////////////////////////////////////
        // Microformat
        
        // create == asset->{html+information to make it}
        // setup the flowplayer div. will be replaced on write using the flowplayer API
        this.microformat.create = function(obj,doc) {
            var wrapperID = Sherd.Base.newID('flowplayer-wrapper-');
            var playerID = Sherd.Base.newID('flowplayer-player-');
            var url = '';
            var pseudo = 0;
            self.media._ready = false;
                   
            url = self.microformat._getUrl(obj);
            pseudo = self.microformat._isPseudostreaming(obj);
            
            if (!obj.options) {
                obj.options = {
                    width: obj.presentation == 'small' ? 310 : 620, 
                    height: obj.presentation == 'small' ? 220 : 440 
                };
            }
            
            create_obj = {
                object: obj,
                htmlID: wrapperID,
                playerID: playerID, // Used by .initialize post initialization
                pseudo: pseudo, // Used by .initialize post initialization
                mediaUrl: url,
                text: '<div id="' + wrapperID + '" class="sherd-flowplayer-wrapper">' + 
                      '   <a href="' + url + '" style="display:block; width:' + obj.options.width + 'px;' + 
                          'height:' + obj.options.height + 'px;" id="' + playerID + '">' +  
                      '   </a>' + 
                      '</div>'
            }
            return create_obj;
        }
        
        // self.components -- Access to the internal player and any options needed at runtime
        this.microformat.components = function(html_dom,create_obj) {
            try {
                var rv = {};
                if (html_dom) {
                    rv.wrapper = html_dom;
                }
                if (create_obj) {
                    rv.starttime = 0;
                    rv.endtime = 0;
                    rv.width = create_obj.object.options.width;
                    rv.playerID = create_obj.playerID;
                    rv.mediaUrl = create_obj.mediaUrl;
                    rv.pseudo = create_obj.pseudo;
                }
                return rv;
            } catch(e) {}
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
        
        // Note: not currently in use
        this.microformat.type = function() { return 'flowplayer'; };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            /** This is SO NOT WORKING. Flowplayer is not happy about getting a new url 
            newUrl = self.utilities.getUrl(obj);
            if (newUrl && document.getElementById(self.components.playerID) && self.media.ready()) {
                try {
                    self.components.player.pause();
                    pseudo = self.utilities.isPseudostreaming(obj);
                    if (pseudo != self.components.pseudo) {
                        //@todo - remove or add the pseudostreaming plugins from the fp options
                    }
                    if (newUrl != self.components.mediaUrl) {
                        self.media._ready = false;
                        log('newUrl: ' + newUrl);
                        self..getClip(0).update({url: newUrl});
                        log('~newUrl');
                    }
                    log('UPDATE UPDATE UPDATE');
                    return true;
                } catch(e) {}
            } **/
            return false;
        };
        
        this.microformat._getUrl = function(obj) {
            var url;
        
            if (obj.flv_pseudo) {
                url = obj.flv_pseudo;
            } else if (obj.mp4_pseudo) {
                url = obj.mp4_pseudo;
            } else if (obj.mp4) {
                url = obj.mp4;
            } else if (obj.flv) {
                url = obj.flv;
            }
            return url;
        }
        
        this.microformat._isPseudostreaming = function(obj) {
            if (obj.flv_pseudo || obj.mp4_pseudo)
                return true;
            else
                return false;
        }
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        // Post-create step. Overriding here to do a component create using the Flowplayer API
        
        this.initialize = function(create_obj) {
            if (create_obj) {
                options = {
                        clip: {
                            autoPlay: create_obj.object.autoplay ? true : false,
                            autoBuffering: true
                        },
                        onLoad: function(player) { 
                            self.media._ready = true;
                        },
                        onSeek: function(player, targetTime) {
                            // log('onSeek: ' + player.bufferLength + " " + targetTime);
                        },
                        onStart: function(player) {
                            // Flowplayer Bug: this is called incorrectly when autoBuffering is set to true. 
                            // They are theoretically working on it. Leaving this comment for future developers.

                            // reset the state so that the seek can be performed and work (theoretically)
                            // note that seek will only work with videos that are being pseudostreamed or really streamed
                            self.events.signal(self.media, 'duration', { start: self.components.starttime, end: self.components.endtime, duration: self.media.duration() });
                            
                            self.setState({ start: self.components.starttime, end: self.components.endtime});
                        },
                        onUpdate: function(player) {
                        }
                   };
                
                if (create_obj.pseudo) {
                    options.plugins = { pseudo: { url: 'flowplayer.pseudostreaming-3.1.3.swf' } } 
                    options.clip.provider = "pseudo";
                }
                
                flowplayer(create_obj.playerID, 
                           "http://releases.flowplayer.org/swf/flowplayer-3.1.5.swf",
                           options);
    
                self.components.player = $f(create_obj.playerID);
                
                // register for notifications from clipstrip to seek to various times in the video
                self.events.connect(self.media, 'seek', self.media, 'seek');
            }
        }
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific

        this.media.duration = function() {
            duration = 0;
            if (self.components.player && self.components.player.isLoaded()) {
                if (self.components.player.getClip().fullDuration)
                    duration = self.components.player.getClip().fullDuration;
            }
            return duration;
        }
        
        this.media.pause = function() {
            if (self.components.player)
                self.components.player.pause();
        }
        
        // this.media.pauseAt notes -- 
        // using the standard timer mechanism
        // Using this method over the Flowplayer's specific "duration" function
        // as the duration cuts the end of the movie in the player, so you can't see
        // the whole thing. Would be great clip functionality, but not for us.
        //
        // Also tried cuepoints. they're great, but there's no way to programmatically remove a cuepoint
        // this is problematic for us, so am sticking with timers for the moment
        // self.components.player.onCuepoint(endtime * 1000, function(clip, cuepoint) { self.media.pause(); }); 
        
        this.media.play = function() {
            if (self.components.player)
                self.components.player.play();
        }

        this.media.isPlaying = function() {
            var playing = false;
            try {
                playing = self.media.state() == 3;
            } catch(e) {}
            return playing;
        }
        
        this.media.ready = function() {
            return self.media._ready;
        }
        
        this.media.seek = function(starttime, endtime) {
            if (self.media.ready()) {
                if (starttime != undefined) {
                    self.components.player.seek(starttime);
                }
                
                if (endtime != undefined) {
                    self.media.pauseAt(endtime);
                }
                
                // clear any saved values if they exist
                delete self.components.starttime;
                delete self.components.endtime;
            } else {
                self.components.starttime = starttime;
                self.components.endtime = endtime;
            }
        }
        
        this.media.time = function() {
            time = 0;
            if (self.components.player && self.components.player.getState() == 3) {
                time = self.components.player.getTime();
                if (time < 1)
                    time = 0;
            }
            return time;
        }
        
        this.media.timestrip = function() {
            return {w: self.components.width,
                    trackX: 30,
                    trackWidth: 395,
                    visible:true
            };
        }
        
        /**
        Returns the state of the player. Possible values are:
            -1  unloaded
            0   loaded
            1   unstarted
            2   buffering
            3   playing
            4   paused
            5   ended
        **/
        this.media.state = function() {
            return self.components.player.getState(); 
        }

    }
}
