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
        // setup the flowplayer div. will be replaced on write using the flowplayer API
        this.microformat.create = function(obj,doc) {
            var wrapperID = Sherd.Base.newID('flowplayer-wrapper-');
            var playerID = Sherd.Base.newID('flowplayer-player-');
            var params = self.microformat._getPlayerParams(obj);

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
            
            var create_obj = {
                object: obj,
                htmlID: wrapperID,
                playerID: playerID, // Used by .initialize post initialization
                timedisplayID: 'timedisplay'+playerID,
                currentTimeID: 'currtime'+playerID,
                durationID: 'totalcliplength'+playerID,
                playerParams: params,
                text: '<div id="timedisplay'+playerID+'" style="visibility:hidden;"><span id="currtime'+playerID+'">00:00:00</span>/<span id="totalcliplength'+playerID+'">00:00:00</span></div><div id="' + wrapperID + '" class="sherd-flowplayer-wrapper sherd-video-wrapper">'
                    +  '<div class="sherd-flowplayer"'
                    +       'style="display:block; width:' + obj.options.width + 'px;'
                    +       'height:' + obj.options.height + 'px;" id="' + playerID + '">'
                    +  '</div>' 
                    + '</div>'
            };
            return create_obj;
        };
        
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
                    rv.timedisplay = document.getElementById(create_obj.timedisplayID);
                    rv.elapsed = document.getElementById(create_obj.currentTimeID);
                    rv.duration = document.getElementById(create_obj.durationID);
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
                } /**
                    else {
                    
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
                }
                    **/
            }
            return rc;
        };
        
        this.microformat._getPlayerParams = function(obj) {
            var rc = {};
            if (obj.mp4_rtmp) {
                var a = self.microformat._parseRtmpUrl(obj.mp4_rtmp);
                rc.url = a.url;
                rc.netConnectionUrl = a.netConnectionUrl;
                rc.provider = 'rtmp';
            } else if (obj.flv_rtmp) {
                var a = self.microformat._parseRtmpUrl(obj.flv_rtmp);
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
            } else if (obj.video_pseudo) {
                rc.url = obj.video_pseudo;
                rc.provider = 'pseudo';
            } else if (obj.video_rtmp) {
                var a = self.microformat._parseRtmpUrl(obj.video_rtmp);
                rc.url = a.url;
                rc.netConnectionUrl = a.netConnectionUrl;
                rc.provider = 'rtmp';
            } else if (obj.video) {
                rc.url = obj.video;
                rc.provider = '';
            } else if (obj.mp3) {
                rc.url = obj.mp3;
            }
            if (rc.provider == 'pseudo' && /\{start\}/.test(rc.url)) {
                var pieces = rc.url.split('?');
                rc.queryString = escape('?'+pieces.pop());
                rc.url = pieces.join('?');
            }
            return rc;
        };
        
        // expected format: rtmp://uis-cndls-3.georgetown.edu:1935/simplevideostreaming//mp4:clayton.m4v
        this.microformat._parseRtmpUrl = function(url) {
            var rc = {};
            
            idx = url.lastIndexOf('//');
            rc.netConnectionUrl = url.substring(0, idx);
            rc.url = url.substring(idx + 2, url.length);
            
            return rc;
        };
        
        
        this.microformat._queueReadyToSeekEvent = function() {
            self.events.queue('flowplayer ready to seek',[
                 {test: function() {
                     // Is the player ready yet?
                     if (self.media.state() > 2) {
                         if (self.media.duration() > 0) {
                             return true;
                         } else if (self.media.isPlaying() && self.components.player.getClip().type === 'audio') {
                             ///SUPER HACKY: MP3's don't load duration until a pause event
                             ///http://flowplayer.org/forum/8/37767
                             ///so we really quickly pause/play for MP3's
                             self.components.player.pause();
                             self.components.player.play();
                         }
                     }
                     return (self.media.state() > 2
                             && self.media.duration() > 0 );
                 }, poll:500},
                 {call: function() {
                     
                     self.events.signal(self/*==view*/, 'duration', { duration: self.media.duration() });
                     self.setState({ start: self.state.starttime, end: self.state.endtime});
                 }
                 }]);
        };
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        // Post-create step. Overriding here to do a component create using the Flowplayer API
        
        this.initialize = function(create_obj) {
            if (create_obj) {
                var tracker;
                if (window._gat && window._gaq_mediathread) {
                    tracker = _gat._getTracker(_gaq_mediathread);
                }
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
                        pseudo: { url: 'flowplayer.pseudostreaming-3.2.2.swf' },
                        rtmp: { url: 'flowplayer.rtmp-3.2.1.swf' },
                        /*
                        captions:{ url: 'flowplayer.captions-3.2.1.swf',
                                   captionTarget:'content'
                                 },
                        content:{ url: 'flowplayer.content-3.2.0.swf',
                                  bottom:45,height:45,backgroundColor:"transparent",backgroundGradient:"none",border:0,textDecoration:"outline",style:{body:{fontSize:14,fontFamily:"Helvetica,Arial",textAlign:"center",color:"#ffffff"}}
                                },
                        */
                        controls:{
                            autoHide:false,
                            volume:false,
                            mute:false,
                            time:false,
                            fastForward:false,
                            fullscreen:true
                        }

                    },
                    playlist: [ 
                        { 
                            url: create_obj.playerParams.url,
                            autoPlay: create_obj.object.autoplay ? true : false
                            //provider: added below conditionally
                        } 
                    ]
                };
                if (create_obj.playerParams.provider) {
                    options.playlist[0].provider = create_obj.playerParams.provider;
                }
            
                if (create_obj.playerParams.provider == 'pseudo') {
                    autoBuffering = true;
                    ///TODO: when we can do update() we'll need to make each clip
                    ///      with its own plugin and load them with player.loadPluginWithConfig()
                    if (create_obj.playerParams.queryString)
                        options.plugins.pseudo.queryString = create_obj.playerParams.queryString;
                }
                
                if (create_obj.playerParams.provider == 'rtmp') {
                    autoBuffering = false; // flowplayer seems to choke with rtmp && autoBuffering 
                    if (create_obj.playerParams.netConnectionUrl)
                        options.playlist[0].netConnectionUrl = create_obj.playerParams.netConnectionUrl;
                }
                
                flowplayer(create_obj.playerID, 
                           flowplayer.swf_location || "http://releases.flowplayer.org/swf/flowplayer-3.2.2.swf",
                           options);
    
                // Save reference to the player
                self.components.player = $f(create_obj.playerID);
                
                // Setup timers to watch for readiness to seek/setState
                self.microformat._queueReadyToSeekEvent();
                
                // register for notifications from clipstrip to seek to various times in the video
                self.events.connect(self, 'seek', self.media.playAt);
                self.events.connect(self, 'duration', function(obj) {
                    self.components.timedisplay.style.visibility = 'visible';
                    self.components.duration.innerHTML = self.secondsToCode(obj.duration);
                });                
                self.events.connect(self, 'playclip', function(obj) {
                    // Call seek directly
                    self.components.player.seek(obj.start);
                    
                    // There's a slight race condition between seeking to the start and pausing.
                    // If the new endtime is less than the old endtime, the pauseAt timer returns true immediately
                    // Getting around this by delaying pause call for a few millis
                    // Play likewise gets a little messed up if the previous clip is still around. So, delaying that too.
                    setTimeout(function() { if (!self.media.isPlaying()) self.media.play(); if (obj.end) self.media.pauseAt(obj.end); }, 750);
                });
                self.events.queue('tick count',
                                  [{test:function() {
                                      self.components.elapsed.innerHTML = self.secondsToCode(self.media.time()); 
                                   },
                                    poll:1000}
                                  ]);
            }
        };
        
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
        };
        
        this.media.pause = function() {
            if (self.components.player)
                self.components.player.pause();
        };
        
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
        };

        this.media.isPlaying = function() {
            var playing = false;
            try {
                playing = (self.media.state() == 3);
            } catch(e) {}
            return playing;
        };
        
        this.media.ready = function() {
            ready = false;
            try {
                ready = self.media.state() > 2;
            } catch (e) {
            }
            return ready;
        };
        
        this.media.seek = function(starttime, endtime, autoplay) {
            // this might need to be a timer to determine "when" the media player is ready
            // it's working differently from initial load to the update method
            if (!self.media.ready()) {
                self.state.starttime = starttime;
                self.state.endtime = endtime;   
            } else {
                if (starttime !== undefined) {
                    self.components.player.seek(starttime);
                }
                
                if (endtime) {
                    self.media.pauseAt(endtime);
                }
                
                // clear any saved values if they exist
                delete self.state.starttime;
                delete self.state.endtime;
                
                // Delay the play for a few milliseconds
                // In an update situation, we need a little time for the seek 
                // to happen before play occurs. Otherwise, the movie just
                // starts from the beginning of the clip and ignores the seek
                if ((autoplay || self.components.autoplay) && self.media.state() != 3) {
                    setTimeout(function() {
                        self.media.play();
                    },100);
                }
            }
        };
        
        this.media.time = function() {
            var time = ((self.media.isPlaying()) 
                        ? self.components.player.getTime()
                        : self.state.last_pause_time || 0
                       );
            if (time < 1)
                time = 0;
            return time;
        };
        
        this.media.timestrip = function() {
            ///TODO: ugh, flowplayer changes scrubber length based on duration timecode
            var w = self.components.width;
            return {w: w,
                    trackX: 43,
                    trackWidth: w-85,
                    visible:true
                   };
        };
        
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
            return ((self.components.player) ? self.components.player.getState() : -1); 

        };

    };
}
