/*
  Support for the Kaltura js-enabled player.  documentation at:
  http://Kaltura.com/api/docs/oembed
 */

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.Kaltura && Sherd.Video.Base) {
    Sherd.Video.Kaltura = function() {
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
            var wrapperID = Sherd.Base.newID('Kaltura-wrapper-');
            ///playerID MUST only have [\w] chars or IE7 will fail
            var playerID = Sherd.Base.newID('Kaltura_player_');
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
            var idx = obj.Kaltura.indexOf('?');
            if (idx > -1) {
                url = obj.Kaltura.substr(0, idx);
            } else {
                url = obj.Kaltura;
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
                text: '<div id="' + wrapperID + '" class="sherd-Kaltura-wrapper">' + 
                      '  <object width="' + obj.options.width + '" height="' + obj.options.height + '" ' +
                        ' classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ' + objectID + '>' + 
                        '  <param name="movie" value="' + url + '?version=3&fs=1&rel=0&egm=0&hd=0&enablejsapi=1&playerapiid=' + playerID + '"></param>' + 
                        '  <param name="allowscriptaccess" value="always"/></param>' + 
                        '  <param name="autoplay" value="' + autoplay + '"></param>' + 
                        '  <param name="width" value="' + obj.options.width + '"></param>' + 
                        '  <param name="height" value="' + obj.options.height + '"></param>' + 
                        '  <param name="allowfullscreen" value="true"></param>' +
                        '  <embed src="' + url + '?version=3&fs=1&rel=0&egm=0&hd=0&enablejsapi=1&playerapiid=' + playerID + '"' + 
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
        this.microformat.type = function() { return 'Kaltura'; };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            if (obj.Kaltura && document.getElementById(self.components.playerID) && self.media.ready()) {
                try {
                    if (obj.Kaltura != self.components.mediaUrl) {
                        // Replacing the 'url' by cue'ing the video with the new url
                        self.components.mediaUrl = obj.Kaltura;
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
                if (starttime != undefined) {
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