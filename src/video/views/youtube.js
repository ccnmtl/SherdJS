/*
  Support for the YouTube js-enabled player.  documentation at:
  http://code.google.com/apis/youtube/js_api_reference.html
  http://code.google.com/apis/youtube/chromeless_example_1.html
  
  Signals:
  duration: signals duration change
  
  Listens For:
  seek: seek to a particular starttime
 */

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.YouTube) {
    Sherd.Video.YouTube = function() {
        var self = this;
        
        Sherd.Video.Base.apply(this,arguments); //inherit -- video.js -- base.js

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
            var wrapperID = Sherd.Base.newID('youtube-wrapper-');
            ///playerID MUST only have [\w] chars or IE7 will fail
            var playerID = Sherd.Base.newID('youtube_player_');
            var autoplay = obj.autoplay ? 1 : 0;
            self.media._ready = false;
            
            if (!obj.options) 
            {
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
            
            // massage the url options if needed, take off everything after the ? mark
            var url;
            var idx = obj.youtube.indexOf('?');
            if (idx > -1) {
                url = obj.youtube.substr(0, idx);
            } else {
                url = obj.youtube;
            }
            
            // For IE, the id needs to be placed in the object.
            // For FF, the id needs to be placed in the embed.
            var objectID = '';
            var embedID = '';
            if (window.navigator.userAgent.indexOf("MSIE") > -1) {
                objectID = 'id="' + playerID + '"';
            } else {
                embedID = 'id="' + playerID + '"';
            }

            return {
                object: obj,
                htmlID: wrapperID,
                playerID: playerID, // Used by microformat.components initialization
                autoplay: autoplay, // Used later by _seek seeking behavior
                mediaUrl: url, // Used by _seek seeking behavior
                text: '<div id="' + wrapperID + '" class="sherd-youtube-wrapper">' + 
                      '  <object width="' + obj.options.width + '" height="' + obj.options.height + '" ' +
                        ' classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ' + objectID + '>' + 
                        '  <param name="movie" value="' + url + '?version=3&fs=1&rel=0&egm=0&hd=0&showinfo=0&probably_logged_in=0&modestbranding=1&enablejsapi=1&playerapiid=' + playerID + '"></param>' + 
                        '  <param name="allowscriptaccess" value="always"/></param>' + 
                        '  <param name="autoplay" value="' + autoplay + '"></param>' + 
                        '  <param name="width" value="' + obj.options.width + '"></param>' + 
                        '  <param name="height" value="' + obj.options.height + '"></param>' + 
                        '  <param name="allowfullscreen" value="true"></param>' +
                        '  <embed src="' + url + '?version=3&fs=1&rel=0&egm=0&hd=0&showinfo=0&probably_logged_in=0&modestbranding=1&enablejsapi=1&playerapiid=' + playerID + '"' + 
                        '    type="application/x-shockwave-flash"' + 
                        '    allowScriptAccess="always"' + 
                        '    autoplay="' + autoplay + '"' + 
                        '    width="' + obj.options.width + '" height="' + obj.options.height + '"' + 
                        '    allowfullscreen="true" ' + embedID +  
                        '  </embed>' + 
                        '</object>' + 
                      '</div>'
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
                    //the first works for everyone except safari
                    //the latter probably works everywhere except IE
                    rv.player = document[create_obj.playerID] || document.getElementById(create_obj.playerID);
                    rv.autoplay = create_obj.autoplay;
                    rv.mediaUrl = create_obj.mediaUrl;
                    rv.playerID = create_obj.playerID;
                    rv.presentation = create_obj.object.presentation;
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
        
        // Note: not currently in use
        this.microformat.type = function() { return 'youtube'; };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            if (obj.youtube && document.getElementById(self.components.playerID) && self.media.ready()) {
                try {
                    if (obj.youtube != self.components.mediaUrl) {
                        // Replacing the 'url' by cue'ing the video with the new url
                        self.components.mediaUrl = obj.youtube;
                        self.components.player.cueVideoByUrl(self.components.mediaUrl, 0);
                    }
                    return true;
                }
                catch (e) {}
            }
            return false;
        };
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        
        this.initialize = function(create_obj) {
            // register for notifications from clipstrip to seek to various times in the video
            self.events.connect(self, 'seek', self.media.playAt);
            
            self.events.connect(self, 'playclip', function(obj) {
                self.setState(obj);
                self.media.play();
            });
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific
        
        // Global function required for the player
        window.onYouTubePlayerReady = function(playerID) {
            if (unescape(playerID) == self.components.playerID) {
                self.media._ready = true;
                
                // reset the state
                self.setState({ start: self.components.starttime, end: self.components.endtime});
                
                // register a state change function
                // @todo -- YouTube limitation does not allow anonymous functions. Will need to address for 
                // multiple YT players on a page
                self.components.player.addEventListener("onStateChange", 'onYTStateChange');
            }
        };

        // This event is fired whenever the player's state changes. Possible values are unstarted 
        // (-1), ended (0), playing (1), paused (2), buffering (3), video cued (5). When the SWF is first loaded 
        // it will broadcast an unstarted (-1) event. 
        // When the video is cued and ready to play it will broadcast a video cued event (5).
        // 
        // @todo -- onYTStateChange does not pass the playerID into the function, which will be 
        // a problem if we ever have multiple players on the page
        window.onYTStateChange = function(newState) {
            //log('window.onYTStateChange: ' + newState);
            switch (newState) {
            case 1:
                var duration = self.media.duration();
                if (duration > 1) {
                    self.events.signal(self, 'duration', { duration: duration });
                }
                break;
            case 2:// stopped
                ///Do NOT clear timers here, because clicking 'play' cycles through a 2-state
                break;
            case 0://finished
                self.events.clearTimers();                
                break;
            }
        };
        
        this.media.duration = function() {
            var duration = 0;
            if (self.components.player) {
                try {
                    duration = self.components.player.getDuration();
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
                    self.components.player.pauseVideo();
                } catch (e) {}
            }
        };
        
        this.media.play = function() {
            if (self.components.player) {
                try {
                    self.components.player.playVideo();
                } catch (e) {}
            }
        };
        
        this.media.ready = function() {
            return self.media._ready;
        };
        
        this.media.isPlaying = function() {
            var playing = false;
            try {
                playing = self.media.state() == 1;
            } catch(e) {}
            return playing;
        };

        this.media.seek = function(starttime, endtime, autoplay) {
            if (self.media.ready()) {
                if (starttime !== undefined) {
                    if (autoplay || self.components.autoplay) {
                        self.components.player.seekTo(starttime, true);
                    } else {
                        self.components.player.cueVideoByUrl(self.components.mediaUrl, starttime);
                    }
                }
            
                if (endtime) {
                    // Watch the video's running time & stop it when the endtime rolls around
                    // Delay the pause a few seconds. In an update situation, there can be a slight
                    // race condition between a prior seek with a greater end time. In that situation,
                    // the seek to the new time hasn't yet occurred and the pauseAt test (self.media.time > endtime)
                    // incorrectly returns true.
                    setTimeout(function() { self.media.pauseAt(endtime); }, 100);
                }
            } else {
                // store the values away for when the player is ready
                self.components.starttime = starttime;
                self.components.endtime = endtime;
            }
        };
        
        this.media.time = function() {
            var time = 0;
            if (self.components.player) {
                try {
                    time = self.components.player.getCurrentTime();
                    if (time < 0)
                        time = 0;
                } catch (e) {
                    // media probably not yet initialized
                }
            }
            return time;
        };
        
        this.media.timestrip = function() {
            var w = self.components.player.width;
            return {
                w: w,
                trackX: 3,
                trackWidth: w-2,
                visible:true
            };
        };

        // Used by tests. Might be nice to refactor state out so that
        // there's a consistent interpretation across controls
        this.media.state = function() {
            return self.components.player.getPlayerState();
        };

        this.media.url = function() {
            return self.components.player.getVideoUrl();
        };
    };
}