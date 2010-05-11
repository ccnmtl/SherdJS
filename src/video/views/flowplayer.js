/* 
 * Using Flowplayer to support the flash video and mp4 formats
 * Support for the Flowplayer js-enabled player.  documentation at:
 * http://flowplayer.org/doc    umentation/api/index.html
 * 
 * Example Files:
 * 
 * Pseudostreaming Flv
 * file: http://vod01.netdna.com/vod/demo.flowplayer/Extremists.flv
 * 
 * Pseudostreaming Mp4
 * file: http://content.bitsontherun.com/videos/LJSVMnCF-327.mp4
 * queryString: ?starttime=${start}
 * 
 * RTMP Flv
 * rtmp://vod01.netdna.com/play//vod/demo.flowplayer/metacafe.flv
 * 
 * RTMP Mp4
 * rtmp://uis-cndls-3.georgetown.edu:1935/simplevideostreaming//mp4:clayton.m4v
 */
if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.Flowplayer && Sherd.Video.Base) {
    Sherd.Video.Flowplayer = function() {
        var self = this;
        
        this.state = {
            starttime:0,
            endtime:0
        };

        Sherd.Video.Base.apply(this,arguments); // inherit -- video.js -- base.js
        
        ////////////////////////////////////////////////////////////////////////
        // Microformat
        
        // create == asset->{html+information to make it}
        // setup the flowplayer div. will be replaced on write using the flowplayer API
        this.microformat.create = function(obj,doc) {
            var wrapperID = Sherd.Base.newID('flowplayer-wrapper-');
            var playerID = Sherd.Base.newID('flowplayer-player-');
            var params = self.microformat._getPlayerParams(obj);

            if (!obj.options) {
                obj.options = {
                    width: (obj.presentation == 'small' ? 310 : (obj.width||480)), 
                    height: (obj.presentation == 'small' ? 220 : (obj.height||360)) 
                };
            }
            
            create_obj = {
                object: obj,
                htmlID: wrapperID,
                playerID: playerID, // Used by .initialize post initialization
                playerParams: params,
                text: '<div id="' + wrapperID + '" class="sherd-flowplayer-wrapper">' +
                      '   <div style="display:block; width:' + obj.options.width + 'px;' + 
                          'height:' + obj.options.height + 'px;" id="' + playerID + '">' +  
                      '   </div>' + 
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
                    rv.width = create_obj.object.options.width;
                    rv.playerID = create_obj.playerID;
                    rv.mediaUrl = create_obj.playerParams.url;
                    rv.presentation = create_obj.object.presentation;
                    rv.autoplay = create_obj.object.autoplay ? true : false;
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
            rc = false;
            newUrl = self.microformat._getPlayerParams(obj);
            if (newUrl.url && document.getElementById(self.components.playerID) && self.media.state() > 0) {
                playlist = self.components.player.getPlaylist();
                if (playlist[0].url == newUrl.url) {
                    // If the url is the same as the previous, just seek to the right spot.
                    // This works just fine.
                    rc = true;
                }
                else {
                    /**
                     * If a new url is requested --
                     * The clip switches properly. But, it will not seek properly
                     * Ditching this until I have some more time to screw around with it
                        if (self.media.state() == 3)
                            self.components.player.pause();
    
                        log('setClip to newUrl: ' + newUrl + ' ' + self.components.autoplay);
                        var clip = { 
                                    url: newUrl, 
                                    autoPlay: self.components.autoplay, 
                                    autoBuffering: true
                                };
                        self.components.player.setClip(clip);
                        
                        self.microformat._queueReadyToSeekEvent();
                    **/
                }
            }
            return rc;
        };
        
        this.microformat._getPlayerParams = function(obj) {
            var rc = {};
            
            if (obj.mp4_rtmp) {
                a = self.microformat._parseRtmpUrl(obj.mp4_rtmp);
                rc.url = a.url;
                rc.netConnectionUrl = a.netConnectionUrl;
                rc.provider = 'rtmp';
            } else if (obj.flv_rtmp) {
                a = self.microformat._parseRtmpUrl(obj.flv_rtmp);
                rc.url = a.url;
                rc.netConnectionUrl = a.netConnectionUrl;
                rc.provider = 'rtmp';
            } else if (obj.flv_pseudo) {
                rc.url = obj.flv_pseudo;
                rc.provider = 'pseudo';
            } else if (obj.mp4_pseudo) {
                rc.url = obj.mp4_pseudo;
                rc.provider = 'pseudo';
            } else if (obj.mp4) {
                rc.url = obj.mp4;
                rc.provider = '';
            } else if (obj.flv) {
                rc.url = obj.flv;
                rc.provider = '';
            }
            return rc;
        }
        
        // expected format: rtmp://uis-cndls-3.georgetown.edu:1935/simplevideostreaming//mp4:clayton.m4v
        this.microformat._parseRtmpUrl = function(url) {
            var rc = {};
            
            idx = url.lastIndexOf('//');
            rc.netConnectionUrl = url.substring(0, idx);
            rc.url = url.substring(idx + 2, url.length);
            
            return rc;
        }
        
        
        this.microformat._queueReadyToSeekEvent = function() {
            self.events.queue('flowplayer ready to seek',[
                 {test: function() {
                     // Is the player ready yet?
                     return self.media.state() > 2;
                 }, poll:500},
                 {call: function() {
                     self.events.signal(djangosherd, 'duration', { duration: self.media.duration() });
                     self.setState({ start: self.state.starttime, end: self.state.endtime});
                 }
                 }]);
        }
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        // Post-create step. Overriding here to do a component create using the Flowplayer API
        
        this.initialize = function(create_obj) {
            if (create_obj) {
                options = {
                    clip: {
                        scaling:"fit",
                        // these are the common clip properties & event handlers
                        // they (theoretically) apply to all the clips
                        onPause:function(clip) {
                            self.state.last_pause_time = self.components.player.getTime();
                        },
                        onSeek:function(clip,target_time) {
                            self.state.last_pause_time = target_time;
                        }
                    },
                    plugins: {
                        pseudo: { url: 'flowplayer.pseudostreaming-3.1.3.swf' },
                        rtmp: { url: 'flowplayer.rtmp-3.1.3.swf' }
                    },
                    playlist: [ 
                        { 
                            url: create_obj.playerParams.url,
                            autoPlay: create_obj.object.autoplay ? true : false,
                            provider: create_obj.playerParams.provider
                        } 
                    ]
                };
                
                if (create_obj.playerParams.provider == 'pseudo') {
                    autoBuffering = true;
                    if (create_obj.object.querystring)
                        options.plugins.pseudo.queryString = create_obj.object.querystring;
                }
                
                if (create_obj.playerParams.provider == 'rtmp') {
                    autoBuffering = false; // flowplayer seems to choke with rtmp && autoBuffering 
                    if (create_obj.playerParams.netConnectionUrl)
                        options.playlist[0].netConnectionUrl = create_obj.playerParams.netConnectionUrl;
                }
                
                flowplayer(create_obj.playerID, 
                           flowplayer.swf_location || "http://releases.flowplayer.org/swf/flowplayer-3.1.5.swf",
                           options);
    
                // Save reference to the player
                self.components.player = $f(create_obj.playerID);
                
                // Setup timers to watch for readiness to seek/setState
                self.microformat._queueReadyToSeekEvent();
                
                // register for notifications from clipstrip to seek to various times in the video
                self.events.connect(djangosherd, 'seek', self.media, 'seek');
                
                self.events.connect(djangosherd, 'playclip', function(obj) {
                    // Call seek directly
                    self.components.player.seek(obj.start);
                    
                    // There's a slight race condition between seeking to the start and pausing.
                    // If the new endtime is less than the old endtime, the pauseAt timer returns true immediately
                    // Getting around this by delaying pause call for a few millis
                    // Play likewise gets a little messed up if the previous clip is still around. So, delaying that too.
                    setTimeout(function() { if (!self.media.isPlaying()) self.media.play(); if (obj.end) self.media.pauseAt(obj.end); }, 750);
                });
            }
        }
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific

        this.media.duration = function() {
            duration = 0;
            if (self.components.player && self.components.player.isLoaded()) {
                fullDuration = self.components.player.getPlaylist()[0].fullDuration;
                if (fullDuration)
                    duration = fullDuration;
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
            if (self.components.player) {
                self.components.player.play();
            }
        }

        this.media.isPlaying = function() {
            var playing = false;
            try {
                playing = (self.media.state() == 3);
            } catch(e) {}
            return playing;
        }
        
        this.media.ready = function() {
            ready = false;
            try {
                ready = self.media.state() > 2;
            } catch (e) {
            }
            return ready;
        }
        
        this.media.seek = function(starttime, endtime) {
            // this might need to be a timer to determine "when" the media player is ready
            // it's working differently from initial load to the update method
            if (!self.media.ready()) {
                self.state.starttime = starttime;
                self.state.endtime = endtime;   
            } else {
                if (starttime != undefined) {
                    self.components.player.seek(starttime);
                }
                
                if (endtime != undefined) {
                    self.media.pauseAt(endtime);
                }
                
                // clear any saved values if they exist
                delete self.state.starttime;
                delete self.state.endtime;
                
                // Delay the play for a few milliseconds
                // In an update situation, we need a little time for the seek 
                // to happen before play occurs. Otherwise, the movie just
                // starts from the beginning of the clip and ignores the seek
                if (self.components.autoplay && self.media.state() != 3) {
                    setTimeout(function() {
                        self.media.play();
                    },100);
                }
            }
        }
        
        this.media.time = function() {
            var time = ((self.media.isPlaying()) 
                        ? self.components.player.getTime()
                        : self.state.last_pause_time || 0
                       );
            if (time < 1)
                time = 0;
            return time;
        }
        
        this.media.timestrip = function() {
            if (self.components.presentation == 'small') {
                return {w: self.components.width,
                    trackX: 30,
                    trackWidth: 95,
                    visible:true
                }
            } else {
                return {w: self.components.width,
                        trackX: 30,
                        trackWidth: 410,
                        visible:true
                }
            }
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
