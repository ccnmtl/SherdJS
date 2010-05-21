/*
Documentation:
  http://service.real.com/help/library/guides/ScriptingGuide/HTML/samples/javaembed/JAVAFrames.htm
  clip position: 
      http://service.real.com/help/library/guides/ScriptingGuide/HTML/samples/javaembed/position.txt
  play/pause: 
      http://service.real.com/help/library/guides/ScriptingGuide/HTML/samples/javaembed/playback1.txt
  embed/object attrs: 
      http://service.real.com/help/library/guides/realone/ProductionGuide/HTML/htmfiles/embed.htm

  SERIALIZATION of asset
       {url:''
	,width:320
	,height:260
	,autoplay:'false'
	,controller:'true'
	,errortext:'Error text.'
	,type:'video/quicktime'
	};
 */
if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.RealPlayer && Sherd.Video.Base) {
    Sherd.Video.RealPlayer = function() {
        var self = this;
        Sherd.Video.Base.apply(this,arguments); //inherit off video.js - base.js
        
        ////////////////////////////////////////////////////////////////////////
        // Microformat
        this.microformat.create = function(obj,doc) {
            var wrapperID = Sherd.Base.newID('realplayer-wrapper-');
            var playerID = Sherd.Base.newID('realplayer-player-');
            var controllerID = Sherd.Base.newID('realplayer-controller-');
            var console = 'Console'+playerID;
            
            if (!obj.options) {
                obj.options = {
                    width: (obj.presentation == 'small' ? 320 : (obj.width||480)), 
                    height: (obj.presentation == 'small' ? 240 : (obj.height||360)) 
                };
            }
            
            var create_obj = {
                object: obj,
                htmlID: wrapperID,
                playerID: playerID, // Used by .initialize post initialization
                text: '<div id="' + wrapperID + '" class="sherd-flowplayer-wrapper" '
                    + '     style="width:'+obj.options.width+'px">' 
                    + '<object id="'+playerID+'" classid="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA"'
                    + '        height="'+obj.options.height+'" width="'+obj.options.width+'">'
                    + '<param name="CONTROLS" value="ImageWindow">'
                    + '<param name="AUTOSTART" value="'+obj.autoplay+'">'
                    + '<param name="CONSOLE" value="'+console+'">'
                    + '<param name="SRC" value="'+obj.realplayer+'">'
                    + '<embed height="'+obj.options.height+'" width="'+obj.options.width+'"'
                    + '       NOJAVA="true" console="'+console+'" '
                    + '  controls="ImageWindow" '
                    + '  src="'+obj.realplayer+'" '
                    + '  type="audio/x-pn-realaudio-plugin" '
                    + '  autostart="'+obj.autoplay+'" > '
                    + '</embed>'
                    + '</object>'
                    + '<object id="'+controllerID+'" classid="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA"'
                    + '        height="36" width="'+obj.options.width+'">'
                    + '<param name="CONTROLS" value="ControlPanel">'
                    + '<param name="CONSOLE" value="'+console+'">'
                    + '<embed src="'+obj.realplayer+'" type="audio/x-pn-realaudio-plugin" controls="ControlPanel" '
                    + '    console="'+console+'" '
                    + '    width="'+obj.options.width+'" '
                    + '    height="36">'
                    + '</embed>'
                    + '</object>'
                    + '</div>'
            }
            return create_obj;
        };
        
        this.microformat.components = function(html_dom,create_obj) {
            try {
                var rv = {};
                if (html_dom) {
                    rv.wrapper = html_dom;
                }
                if (create_obj) {
                    var objs = html_dom.getElementsByTagName('object');
                    var embs = html_dom.getElementsByTagName('embed');
                    if (embs.length) {//netscape
                        rv.player = rv.playerNetscape = embs[0];
                        rv.controllerNetscape = embs[1];
                    } else {
                        rv.player = rv.playerIE = objs[0];
                        rv.controllerIE = objs[1];
                    }

                    rv.width = (create_obj.options && create_obj.options.width) || rv.player.offsetWidth;
                    rv.mediaUrl = create_obj.realplayer;
                } 
                return rv;
            } catch(e) {}
            return false;
        };
        
        // Find the objects based on the individual player properties in the DOM
        // Works in conjunction with read
        this.microformat.find = function(html_dom) {
            throw Error("unimplemented");
            var found = [];
            return found;
        };
        
        // Return asset object description (parameters) in a serialized JSON format.
        // Will be used for things like printing, or spitting out a description.
        // works in conjunction with find
        this.microformat.read = function(found_obj) {
            throw Error("unimplemented");
            var obj = {};
            return obj;
        };

        this.microformat.type = function() { return 'realplayer'; };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            return false;
            if (obj.realplayer && self.components.player && self.media.ready()) {
                try {
                    if (obj.realplayer != self.components.mediaUrl) {
                        return false;
                    }
                    return true;
                } catch(e) { }
            }
            return false;
        }
        
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        
        this.initialize = function(create_obj) {
            self.events.connect(djangosherd, 'seek', self.media, 'seek');
            self.events.connect(djangosherd, 'playclip', function(obj) {
                    self.setState(obj);
                    self.media.play();
                });

        };
        
        // Overriding video.js
        this.deinitialize = function() {
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific
        
        this.media.duration = function() {
            var duration = 0;
            try {
                if (self.components.player 
                    && typeof self.components.player.GetLength != 'undefined') {
                    ///Real API returns milliseconds
                    duration = self.components.player.GetLength()/1000 ;
                    self.events.signal(djangosherd, 'duration', { duration: duration });
                }
            } catch(e) {}
            return duration;
        };
        
        this.media.pause = function() {
            if (self.components.player)
                self.components.player.DoPause();
        };
        
        this.media.play = function() {
            if (self.media.ready()) {
                self.components.player.DoPlay();
            } else {
                self.events.queue('real play',[
                                          {test: self.media.ready, poll:100},
                                          {call: self.media.play}
                                          ]);
            }
        };
        
        // Used by tests
        this.media.isPlaying = function() {
            var playing = false;
            try {
                ///API:0=stopped,1=contacting,2=buffering,3=playing,4=paused,5=seeking
                playing = (self.components.player
                           && self.components.player.GetPlayState
                           && self.components.player.GetPlayState() == 3);
            } catch(e) {}
            return playing;
        };
        
        this.media.ready = function() {
            var status;
            try {
                var p = self.components.player;
                return (p && typeof p.GetPlayState != 'undefined') 
            } catch(e) {
                return false;
            } 
        };

        this.media.seek = function(starttime, endtime) {
            if (self.media.ready()) {
                if (starttime != undefined) {
                    ///API in milliseconds
                    self.components.player.SetPosition(starttime*1000);
                }
                if (endtime != undefined) {
                    // Watch the video's running time & stop it when the endtime rolls around
                    self.media.pauseAt(endtime);
                }
            }

            // store the values away for when the player is ready
            self.components.starttime = starttime;
            self.components.endtime = endtime;
        }
        
        this.media.time = function() {
            var time = 0;
            try {
                time = self.components.player.GetPosition()/1000;
            } catch(e) {}
            return time;
        }
        
        this.media.timescale = function() {
            return 1;
        }
        
        this.media.timestrip = function() {
            var w = self.components.player.width;
            return {w: w,
                trackX: 110,
                trackWidth: w-220,
                visible:true
            }
        }
        
        //returns true, if we're sure it is. Not currently used
        this.media.isStreaming = function() {
            return true;
        };

        // Used by tests.
        this.media.url = function() {
            return self.components.player.GetURL();
        }
        
        this.media._updateTickCount = function() {
            if (typeof self.components.player.GetRate != 'undefined'
                && self.components.player.GetRate() > 0) { 
                self.components.elapsed.innerHTML = self.secondsToCode(self.media.time()); 
            } 
        }
    } //Sherd.Video.RealPlayer

}