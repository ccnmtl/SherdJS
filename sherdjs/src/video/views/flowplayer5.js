/*
 * Using Flowplayer 5 to support the flash video and mp4 formats
 * Support for the Flowplayer js-enabled player.  documentation at:
 * https://flowplayer.org/docs/api.html
 *
 *
 */
if (!Sherd) { Sherd = {}; }
if (!Sherd.Video) { Sherd.Video = {}; }
if (!Sherd.Video.Flowplayer5 && Sherd.Video.Base) {
    Sherd.Video.Flowplayer5 = function () {
        var self = this;
        
        this.state = {ready: false};
       
        Sherd.Video.Base.apply(this, arguments); // inherit -- video.js -- base.js
        
        this.presentations = {
            'small': {
                width: function () { return 310; },
                height: function () { return 220; }
            },
            'medium': {
                width: function () { return 475; },
                height: function () { return 336; }
            },
            'default': {
                width: function () { return 620; },
                height: function () { return 440; }
            }
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Microformat
        
        // create == asset->{html+information to make it}
        // setup the flowplayer div. will be replaced on write using the flowplayer API
        this.microformat.create = function (obj, doc) {
            var wrapperID = Sherd.Base.newID('flowplayer5-wrapper-');
            var playerID = Sherd.Base.newID('flowplayer5-player-');
            var params = self.microformat._getPlayerParams(obj);

            if (!obj.options) {
                var presentation;
                switch (typeof obj.presentation) {
                case 'string':
                    presentation = self.presentations[obj.presentation];
                    break;
                case 'object':
                    presentation = obj.presentation;
                    break;
                case 'undefined':
                    presentation = self.presentations['default'];
                    break;
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
                timedisplayID: 'timedisplay' + playerID,
                currentTimeID: 'currtime' + playerID,
                durationID: 'totalcliplength' + playerID,
                playerParams: params,
                text: '<div class="flowplayer-timedisplay" id="timedisplay' + playerID + '" style="visibility:hidden;"><span id="currtime' + playerID + '">00:00:00</span>/<span id="totalcliplength' + playerID + '">00:00:00</span></div><div id="' + wrapperID + '" class="sherd-flowplayer-wrapper sherd-video-wrapper">' +
                      '<div class="sherd-flowplayer"' +
                           'style="display:block; width:' + obj.options.width + 'px;' +
                           'height:' + obj.options.height + 'px;" id="' + playerID + '">' +
                      '</div>' +
                     '</div>'
            };
            
            if (obj.metadata) {
                for (var i = 0; i < obj.metadata.length; i++) {
                    if (obj.metadata[i].key === 'duration') {
                        create_obj.staticDuration = obj.metadata[i].value;
                    }
                }
            }
            
            return create_obj;
        };
        
        // self.components -- Access to the internal player and any options needed at runtime
        this.microformat.components = function (html_dom, create_obj) {
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
                    rv.lastDuration = 0;
                    rv.itemId = create_obj.object.id;
                    rv.primaryType = create_obj.object.primary_type;                    
                    
                    if (create_obj.staticDuration) {
                        rv.staticDuration = create_obj.staticDuration;
                    }
                }
                return rv;
            } catch (e) {}
            return false;
        };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function (obj, html_dom) {
/**            
            var rc = false;
            var newUrl = self.microformat._getPlayerParams(obj);
            if (newUrl.url && document.getElementById(self.components.playerID) && self.media.state() > 0) {
                var playlist = self.components.player.getPlaylist();
                if (playlist[0].url == newUrl.url) {
                    // If the url is the same as the previous, just seek to the right spot.
                    // This works just fine.
                    rc = true;
                    delete self.state.starttime;
                    delete self.state.endtime;
                    delete self.state.last_pause_time;
                }
            }
            return rc;
**/            
        };
        
        this.microformat._getPlayerParams = function (obj) {
            var rc = {};
            if (obj.mp4_rtmp) {
                var a = self.microformat._parseRtmpUrl(obj.mp4_rtmp);
                rc.url = a.url;
                rc.netConnectionUrl = a.netConnectionUrl;
                rc.provider = 'rtmp';
            } else if (obj.flv_rtmp) {
                var rtmp = self.microformat._parseRtmpUrl(obj.flv_rtmp);
                rc.url = rtmp.url;
                rc.netConnectionUrl = rtmp.netConnectionUrl;
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
                var video_rtmp = self.microformat._parseRtmpUrl(obj.video_rtmp);
                rc.url = video_rtmp.url;
                rc.netConnectionUrl = video_rtmp.netConnectionUrl;
                rc.provider = 'rtmp';
            } else if (obj.video) {
                rc.url = obj.video;
                rc.provider = '';
            } else if (obj.mp3) {
                rc.url = obj.mp3;
                rc.provider = 'audio';
            } else if (obj.mp4_audio) {
                rc.url = obj.mp4_audio;
                rc.provider = 'pseudo';
            }
            if (rc.provider === 'pseudo' && /\{start\}/.test(rc.url)) {
                var pieces = rc.url.split('?');

                // Bookmarklet bug in the JWPlayer scraping code led to
                // a lot of assets being added without the required $ 
                // in front of the start variable. This is a little patch 
                // so we don't have to redo all the asset primary sources at once.
                var queryString = pieces.pop();
                if (queryString === 'start={start}') {
                    queryString = 'start=${start}';
                }
                rc.queryString = escape('?' + queryString);
                rc.url = pieces.join('?');
            }
            return rc;
        };
        

        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        // Post-create step. Overriding here to do a component create using the Flowplayer API
        
        this.disconnect_pause = function() {
            self.events.killTimer('flowplayer pause');  
        };
        
        this.disconnect_tickcount = function() {
          self.events.killTimer('tick count');  
        };

        this.connect_tickcount = function() {
            self.events.queue('tick count', [{
                test : function () {
                    self.components.elapsed.innerHTML =
                        self.secondsToCode(self.media.time());
                    
                    if (self.components.provider === "audio") {
                        self.media.duration();
                    }
                },
                poll: 1000
            }]);  
        };
        
        this.initialize = function (create_obj) {
            if (create_obj) {
                var options = {
                    // one video: a one-member playlist
                    playlist: [[
                          {mp4: create_obj.playerParams.url}
                       ]
                    ]
                 };
                
                var elt = jQuery("#" + create_obj.playerID);
                jQuery(elt).flowplayer(options);
                
                jQuery(window).trigger('video.create', [self.components.itemId, self.components.primaryType]);
    
                // Save reference to the player
                self.components.player = flowplayer(elt);
                self.components.provider = create_obj.playerParams.provider;
                
                // register for notifications from clipstrip to seek to various times in the video
                self.events.connect(self, 'seek', self.media.playAt);
                self.events.connect(self, 'duration', function (obj) {
                    self.components.timedisplay.style.visibility = 'visible';
                    self.components.duration.innerHTML = self.secondsToCode(obj.duration);
                });
                self.events.connect(self, 'playclip', function (obj) {
                    self.media.seek(obj.start, obj.end, true);
                });
                
                self.components.player.bind("ready", function(e, api) {
                    self.state.ready = true;
                });
                self.components.player.bind("resume", function(e, api) {
                    self.connect_tickcount();
                });
                self.components.player.bind("stop", function(e, api) {
                    self.disconnect_tickcount();
                    self.disconnect_pause();
                });
                self.components.player.bind("pause", function(e, api) {
                    self.disconnect_tickcount();
                    self.disconnect_pause();
                });
            }
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific

        this.media.duration = function () {
            return self.components.player ? 
                self.components.player.duration : 0;
        };
        
        this.media.pause = function () {
            if (self.components.player) {
                self.components.player.pause();
            }
        };

        this.media.play = function () {
            if (self.components.player) {
                self.components.player.play(0);
            }
        };

        this.media.isPlaying = function () {
            return self.components.player && self.components.player.playing;
        };
        
        this.media.ready = function () {
            return self.state.ready;
        };
        
        this.media.seek = function (starttime, endtime, autoplay) {
            if (starttime !== undefined) {
                self.components.player.seek(starttime);
            }
                
            if (endtime) {
                self.media.pauseAt(endtime);
            }
                
            if ((autoplay || self.components.autoplay) && !self.media.isPlaying()) {
                self.media.play();
            }
        };
        
        this.media.time = function () {
            return self.components.player ? 
                self.components.player.time : 0;
        };
        
        this.media.timestrip = function () {
            // The clipstrip is calibrated to the flowplayer scrubber
            // Visually, it looks a little "short", but trust, it tags along
            // with the circle shaped thumb properly.
            var w = self.components.width;
            return {w: w,
                    trackX: 47,
                    trackWidth: w - 185,
                    visible: true
                   };
        };
    };
}
