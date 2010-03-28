/*
 http://developer.apple.com/mac/library/documentation/QuickTime/Conceptual/QTScripting_JavaScript/aQTScripting_Javascro_AIntro/Introduction%20to%20JavaScript%20QT.html
 
  SERIALIZATION of asset
       {url:''
	,width:320
	,height:260
	,autoplay:'false'
	,controller:'true'
	,errortext:'Error text.'
	,type:'video/quicktime'
	};
	
	@todo - Stop using the quicktime poster movie type and just create a clickable jpg that shows the real quicktime movie.
	This should allow a transparent arrow to be overlayed onto the poster so cheesy control text "Click to Play" can be removed.
	Some tips here: http://digitalmedia.oreilly.com/2006/09/29/two-slick-quicktime-tricks.html?page=2
 */
if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.QuickTime && Sherd.Video.Base) {
    Sherd.Video.QuickTime = function() {
        var self = this;
        self._played = false; // See this.media.seek
        self._count = -1;
        Sherd.Video.Base.apply(this,arguments); //inherit off video.js - base.js
        
        ////////////////////////////////////////////////////////////////////////
        // Microformat
        
        this.microformat.create = function(obj,doc) {
            
            var wrapperID = Sherd.Base.newID('quicktime-wrapper-');
            var playerID = Sherd.Base.newID('quicktime-player-');
            self._played = false;
            self._count = self._count + 1;
            
            var opt = {
                    url:'',
                    width:320,
                    height:260,
                    autoplay:'false',
                    controller:'true',
                    errortext:'Error text.',
                    mimetype:'video/quicktime',
                    poster:false,
                    loadingposter:false,
                    extra:''
            };
            for (a in opt) {
                if (obj[a]) opt[a] = obj[a];
            }
            opt.href= '';//for poster support
            opt.autohref= '';//for poster support
            if (!(/Macintosh.*[3-9][.0-9]+ Safari/.test(navigator.userAgent)
                    || /Linux/.test(navigator.userAgent)
            )) {
                if (opt.autoplay == 'true' && opt.loadingposter) {
                    opt.mimetype = 'image/x-quicktime';
                    opt.extra += '<param name="href" value="'+opt.url+'" /> \
                    <param name="autohref" value="true" /> \
                    <param name="target" value="myself" /> \
                    ';
                    opt.url = opt.poster;
                    opt.controller = 'true';
                } else if (opt.poster) {
                    opt.mimetype = 'image/x-quicktime';
                    opt.extra += '<param name="href" value="'+opt.url+'" /> \
                    <param name="autohref" value="'+opt.autoplay+'" /> \
                    <param name="target" value="myself" /> \
                    ';
                    opt.url = opt.poster;
                    opt.controller = 'false';
                }
            }
            
            var clicktoplay = "";
            if (opt.autoplay != 'true') {
                clicktoplay = '<div id="clicktoplay">Click video to play</div>';
            }
            
            //we need to retest where the href usecase is needed
            //since safari breaks
            return {htmlID:wrapperID,
                playerID:playerID,
                currentTimeID:'currtime',
                durationID:'totalcliplength',
                object:obj,
                text: clicktoplay + '<div id="'+wrapperID+'" class="sherd-quicktime-wrapper">\
                <!--[if IE]>\
                    <object id="'+playerID+'" \
                    width="'+opt.width+'" height="'+opt.height+'" \
                    style="behavior:url(#qt_event_source)"  \
                    codebase="http://www.apple.com/qtactivex/qtplugin.cab"  \
                    classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B"> \
                <![endif]--> \
                <!--[if !IE]><--> \
                    <object id="'+playerID+'" type="'+opt.mimetype+'" \
                    data="'+opt.url+'" \
                    width="'+opt.width+'" height="'+opt.height+'">  \
                <!-- ><![endif]--> \
                <param name="src" value="'+opt.url+'" /> \
                <param name="controller" value="'+opt.controller+'" /> \
                <param name="type" value="'+opt.mimetype+'" /> \
                <param name="enablejavascript" value="true" /> \
                <param name="autoplay" value="'+opt.autoplay+'" /> \
                <param name="width" value="320"> \
                <param name="height" value="256"> \
                <param name="postdomevents" value="true" /> \
                '+opt.extra+'\
                '+opt.errortext+'</object></div>\
                <div id="time-display" style="display: none;"><div id="currtime">00:00:00</div>/<div id="totalcliplength">00:00:00</div></div>'
            };
        };
        
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
                    rv.duration = document[create_obj.durationID] || document.getElementById(create_obj.durationID);
                    rv.elapsed = document[create_obj.currentTimeID] || document.getElementById(create_obj.currentTimeID);
                    rv.timedisplay = document['time-display'] || document.getElementById('time-display');
                    rv.autoplay = create_obj.object.autoplay == 'true';
                    rv.playerID = create_obj.playerID;
                    rv.htmlID = create_obj.htmlID;
                    rv.mediaUrl = create_obj.object.quicktime;
                } 
                return rv;
            } catch(e) {}
            return false;
        };
        
        // Find the objects based on the individual player properties in the DOM
        // NOTE: Not currently in use.
        // Works in conjunction with read
        this.microformat.find = function(html_dom) {
            // Find the objects based on the QT properties in the DOM
            var found = [];
            //SNOBBY:not embeds, since they're in objects--and not xhtml 'n' stuff
            var objects = ((html_dom.tagName.toLowerCase()=='object')
                    ?[html_dom]
                      :html_dom.getElementsByTagName('object')
                      //function is case-insensitive in IE and FFox,at least
            );
            for(var i=0;i<objects.length;i++) {
                if (objects[i].getAttribute('classid')=='clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B'
                    || objects[i].getAttribute('type')=='video/quicktime'
                )
                    found.push({'html':objects[i]});
            }
            return found;
        };
        
        // Return asset object description (parameters) in a serialized JSON format.
        // NOTE: Not currently in use. 
        // Will be used for things like printing, or spitting out a description.
        // works in conjunction with find
        this.microformat.read = function(found_obj) {
            var obj = {
                    url:'',//defaults
                    quicktime:'',
                    width:320,
                    height:260,
                    autoplay:'false',
                    controller:'true',
                    errortext:'Error text.',
                    type:'video/quicktime'
            };
            var params = found_obj.html.getElementsByTagName('param');
            for (var i=0;i<params.length;i++) {
                obj[params[i].getAttribute('name')] = params[i].getAttribute('value');
            }
            if (obj.src) {
                obj.url = obj.src;
                delete obj.src;
            } else {
                obj.url = found_obj.html.getAttribute('data');
            }
            obj.quicktime = obj.url;
            if (Number(found_obj.html.width)) obj.width=Number(found_obj.html.width);
            if (Number(found_obj.html.height)) obj.height=Number(found_obj.html.height);
            return obj;
        };

        this.microformat.type = function() { return 'quicktime'; };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            if (obj.quicktime && document.getElementById(self.components.playerID) && self.media.ready()) {
                try {
                    
                    if (obj.quicktime != self.components.mediaUrl) {
                        self.components.player.SetURL(obj.quicktime);
                        self.components.mediaUrl = obj.quicktime;
                        
                        // Sky says: Used to need this as IE was 'double-loading' the video.  
                        // The behavior was that the video would come in, and then it would start playing in a smaller 
                        // frame (or something else weird), and often you'd hear two audio tracks playing (out of sync).
                        //
                        // Susan says: I experienced something similar to the double-load, but this workaround didn't fix it. 
                        // I did see the QT player freeze and just play the audio track when the player was created, then 
                        // recreated. (Play QT, Play YouTube, Play QT). Resetting the URL seems to take care of the state problem.
                        if (/Trident/.test(navigator.userAgent) && self.components.autoplay && self._count > 0) {
                            window.setTimeout(function() {
                                self.components.player.SetURL(self.components.mediaUrl); //reset the url
                                
                                // @todo -- seek may be happening too soon here. Consider kicking off the read to seek thread
                                self.media.seek(self.components.starttime, self.components.endtime); // redo the seek also.
                            }, 400);
                        }
                    }
                    self.microformat._startUpdateDisplayTimer();
                    self._count = self._count + 1;
                    return true;
                } catch(e) { }
            }
            return false;
        }
        
        this.microformat._startUpdateDisplayTimer = function() {
            self.media._duration = 0;
            self.events.queue('quicktime duration watcher & tick count',[
                                                                         {test: function() {
                                                                             // Update the duration
                                                                             var newDuration = self.media.duration();
                                                                             if (newDuration != self.media._duration) {
                                                                                 self.media._duration = newDuration;
                                                                                 self.components.duration.innerHTML = self.secondsToCode(newDuration);
                                                                                 self.events.signal(djangosherd, 'duration', { duration: newDuration });
                                                                             }
                                                                             
                                                                             if (self.media.ready() && self.components.timedisplay.style.display == 'none')
                                                                                 self.components.timedisplay.style.display = 'inline';
                                                                             
                                                                             // Update the tick count
                                                                             self.media._updateTickCount();
                                                                             
                                                                             return false;
                                                                         }, poll:400},
                                                                         ]);
        }
        
        ////////////////////////////////////////////////////////////////////////
        // AssetView Overrides
        
        this.initialize = function(create_obj) {
            self.media._duration = self.media.duration();
            
            // kickoff some timers
            self.events.queue('quicktime ready to seek',[
                                                  {test: function() {
                                                      // Is the duration valid yet?
                                                      var movDuration = self.components.player.GetDuration();
                                                      var adjustedDuration = self.media.duration();
                                                      ready = self.media.ready() && 
                                                              movDuration < 2147483647 && 
                                                              adjustedDuration >= 1 &&
                                                              (self.components.player.GetMaxTimeLoaded()/self.media.timescale()) > self.components.starttime;
                                                      
                                                      return ready; 
                                                  }, poll:500},
                                                  {call: function() {
                                                            self.setState({ start: self.components.starttime, end: self.components.endtime});
                                                         }
                                                  }]);
            
            self.microformat._startUpdateDisplayTimer();
            
            // register for notifications from clipstrip to seek to various times in the video
            self.events.connect(djangosherd, 'seek', self.media, 'seek');
            
            self.events.connect(djangosherd, 'playclip', function(obj) {
                self.setState(obj);
                
                // give it a second
                window.setTimeout(function() { self.media.play(); }, 200);
            });
        };
        
        // Overriding video.js
        this.deinitialize = function() {
            self.events.clearTimers();
            
            if (self.media.isPlaying()) {
                self.media.pause();
            }
            if (self.components.timedisplay) {
                self.components.timedisplay.style.display = 'none';
            }
            
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Media & Player Specific
        
        this.media.duration = function() {
            var duration = 0;
            try {
                duration = self.components.player.GetDuration()/self.media.timescale();
            } catch(e) {}
            return duration;
        };
        
        this.media.pause = function() {
            if (self.components.player)
                self.components.player.Stop();
        };
        
        this.media.play = function() {
            if (self.media.ready()) {
                var mimetype = self.components.player.GetMIMEType();
                if (!self._played && /image/.test(mimetype)) {
                    // Setting the URL in this manner is only needed the first time through
                    // In order to facilitate fast seeking and update, keep track of the first time
                    // via the _played class variable, then default to a regular play event
                    self.components.player.SetURL(self.components.player.GetHREF());
                    self._played = true;
                } else {
                    self.components.player.Play();
                }       
            } else {
                self.events.queue('qt play',[
                                          {test: self.media.ready, poll:100},
                                          {call: function() { self.media.play } }
                                          ]);
            }
        };
        
        // Used by tests
        this.media.isPlaying = function() {
            var playing = false;
            try {
                playing = self.components.player.GetRate() > 0;
            } catch(e) {}
            return playing;
        };
        
        this.media.ready = function() {
            var status;
            try {
                status = self.components.player.GetPluginStatus();
            } catch(e) {} // player is not yet ready

            return status == 'Playable' || status == 'Complete';
        };

        this.media.seek = function(starttime, endtime) {
            if (self.media.ready()) {
                
                if (starttime != undefined) {
                    playRate = self.components.player.GetRate();
                    if (playRate > 0)
                        self.components.player.Stop(); // HACK: QT doesn't rebuffer if we don't stop-start
                    try {
                        self.components.player.SetTime(starttime * self.media.timescale());
                    } catch(e) {}
                    if (self.components.autoplay || playRate != 0) {
                        self.components.player.Play();
                    }
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
                time = self.components.player.GetTime()/self.media.timescale();
            } catch(e) {}
            return time;
        }
        
        this.media.timescale = function() {
            var timescale = 1;
            try {
                timescale = self.components.player.GetTimeScale();
            } catch(e) {}
            return timescale;
        }
        
        this.media.timestrip = function() {
            return {w: self.components.player.width,
                trackX: 40,
                trackWidth: 228,
                visible:true
            }
        }
        
        //returns true, if we're sure it is. Not currently used
        this.media.isStreaming = function() {
            //2147483647 (=0x7FFFFFFF) 0x7FFFFFFF is quicktime's magic number for streaming.
            var url = self.components.player.GetURL();
            return (url && /^rtsp/.test(url));
        };

        // Used by tests.
        this.media.url = function() {
            return self.components.player.GetURL();
        }
        
        this.media._updateTickCount = function() {
            if (self.components.player.GetRate() > 0) { 
                self.components.elapsed.innerHTML = self.secondsToCode(self.media.time()); 
            } 
        }
    } //Sherd.AssetViews.QuickTime
}