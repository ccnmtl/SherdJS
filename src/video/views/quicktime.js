//status: porting
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


 */
if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.QuickTime && Sherd.Video.Base) {
    Sherd.Video.QuickTime = function() {
        var self = this;
        Sherd.Video.Base.apply(this,arguments); //inherit off video.js - base.js
        
        this.media.ready = function() {
            var status;
            try {
                status = self.components.player.GetPluginStatus();
            } catch(e) {} // player is not yet ready

            return status == 'Playable' || status == 'Complete';
        }
        
        this.media.timescale = function() {
            var timescale = 1;
            try {
                timescale = self.components.player.GetTimeScale();
            } catch(e) {}
            return timescale;
        }
        
        this.media.time = function() {
            var time = 0;
            try {
                time = self.components.player.GetTime()/self.media.timescale();
            } catch(e) {}
            return time;
        }
        
        this.media.duration = function() {
            var duration = 0;
            try {
                duration = self.components.player.GetDuration()/self.media.timescale();
            } catch(e) {}
            return duration;
        }
        
        this.media.play = function() {
            if (self.media.ready()) {
                var mimetype = self.components.player.GetMIMEType();
                if (/image/.test(mimetype)) {
                    self.components.player.SetURL(self.components.player.GetHREF());
                } else {
                    self.components.player.Play();
                }       
            } else {
                self.events.queue('qt play',[
                                          {test: self.media.ready, poll:500},
                                          {call: self.media.play }
                                          ]);
            }
        }
        
        this.media.pause = function() {
            self.components.player.Stop();
        }
        
        this.media.pauseAt = function(endtime) {
            log('this.media.pauseAt');
            if (endtime) {
                self.events.queue('qt pause',[
                                          {test: function() { return self.media.time() >= endtime}, poll:500},
                                          {call: function() { self.media.pause(); }}
                                          ]);
            }
        }
        
        //returns true, if we're sure it is
        this.media.isStreaming = function() {
            //2147483647 (=0x7FFFFFFF) 0x7FFFFFFF is quicktime's magic number for streaming.
            var url = self.components.player.GetURL();
            return (url && /^rtsp/.test(url));
        }
        
        this.media.seek = function(starttime, endtime) {
            log('this.media.seek');
            
            if (self.media.ready()) {
                if (starttime != undefined) {
                    playRate = parseInt(self.components.player.GetRate(), 10);
                    self.components.player.Stop(); // HACK: QT doesn't rebuffer if we don't stop-start
                    self.components.player.SetTime(starttime * self.media.timescale());
                    if (!self.components.autoplay) {
                        self.components.player.SetRate(playRate);
                    }
                    if (self.components.autoplay || playRate != 0) {
                        self.components.player.Play();
                    }
                }
            
                if (endtime != undefined) {
                    // Watch the video's running time & stop it when the endtime rolls around
                    self.media.pauseAt(endtime);
                }
                
                // clear any saved values if they exist
                delete self.components.starttime;
                delete self.components.endtime;
            } else {
                // store the values away for when the player is ready
                self.components.starttime = starttime;
                self.components.endtime = endtime;
            }
        }
        
        this.media.timestrip = function() {
            return {w: self.components.player.width,
                trackX: 40,
                trackWidth: 228,
                visible:true
            };
        }
        
        // Return false while playing, return true while paused
        this.media.updateTickCount = function() {
            if (self.components.player.GetRate() > 0) { 
                self.components.elapsed.innerHTML = self.secondsToCode(self.media.time()); 
            } 
        }
        
        this.microformat.type = function() { return 'quicktime'; };
        
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
                    type:'video/quicktime',
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
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            if (!obj.quicktime) {return false;}
            var compo = self.components || self.microformat.components(html_dom);
            if (compo && compo.media && compo.media != null) {
                try {
                    compo.media.SetURL(obj.quicktime);
                    return true;
                } catch(e) { }
            }
            return false;
        };

        this.initialize = function(create_obj) {
            ///used to need this.  crazy, 'cause I sweated big time to make this doable here :-(
            if (/Trident/.test(navigator.userAgent) && create_obj.object.autoplay=='true') {
                ///again!  just for IE.  nice IE, gentle IE
                var top = document.getElementById(create_obj.htmlID);
                setTimeout(function() {
                    self.microformat.update(create_obj.object, top);
                },100);
            }
            
            self.media._duration = self.media.duration();
            
            // kickoff some timers
            self.events.queue('quicktime ready',[
                                                  {test: function() { return self.media.ready(); }, poll:500},
                                                  {call: function() { 
                                                      self.setState({ start: self.components.starttime, end: self.components.endtime});
                                                      self.components.timedisplay.style.display = 'inline';
                                                      }
                                                  }
                                                  ]);
                                                  
            self.events.queue('quicktime duration watcher & tick count',[
                                               {test: function() {
                                                   // Update the duration
                                                   newDuration = self.media.duration();
                                                   if (newDuration != self.media._duration) {
                                                       self.media._duration = newDuration;
                                                       self.components.duration.innerHTML = self.secondsToCode(newDuration);
                                                   }
                                                   
                                                   // Update the tick count
                                                   self.media.updateTickCount();
                                                   
                                                   return false;
                                               }, poll:400},
                                               ]);           
            
            /** Domevents apparently don't play well with IE. Switching to timers until
             *  we can switch back to an event driv
             * Domevents are available in QT v. 7.1.2 -- released in October 2007
             
            // MochiKit!!!
            connect(self.components.player, 'onqt_begin', function() {
                    log('qt_begin');
                    self.media._loaded = true; 

                    // reset the state
                    self.setState({ start: self.components.starttime, end: self.components.endtime});
                 });
            
            connect(self.components.player, 'onqt_durationchange', function() { 
                    log('qt_durationchange');
                    self.components.duration.innerHTML = self.secondsToCode(self.media.duration());
                });
            
            connect(self.components.player, 'onqt_play', function() {
                    log('onqt_play');
                    self.media._playing = true;
                    self.events.queue('qt tick',[{test: self.media.updateTickCount, poll:500}]);
                    self.components.timedisplay.style.display = 'inline';
                });
            
            connect(self.components.player, 'onqt_pause', function() {
                    log('onqt_pause');
                    self.media._playing = false;
                });
            connect(self.components.player, 'onqt_ended', function() {
                    log('onqt_ended');
                    self.media._playing = false;
                });
            */
        }
        
        this.deinitialize = function() {
            if (self.components.timedisplay) {
                self.components.timedisplay.style.display = 'none';
            }
            self.events.clearTimers();
        }
        
        
        this.microformat.create = function(obj,doc) {
            var wrapperID = Sherd.Base.newID('quicktime-wrapper');
            var id = (typeof self.id=='function')?self.id():Sherd.Base.newID('quicktime');
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
                    opt.controller = 'false';
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
            //we need to retest where the href usecase is needed
            //since safari breaks
            return {htmlID:wrapperID,
                mediaID:id,
                currentTimeID:'currtime',
                durationID:'totalcliplength',
                object:obj,
                text:'<div id="'+wrapperID+'" class="sherd-quicktime-wrapper">\
                <!--[if IE]>\
                    <object id="'+id+'" \
                    width="'+opt.width+'" height="'+opt.height+'" \
                    style="behavior:url(#qt_event_source)"  \
                    codebase="http://www.apple.com/qtactivex/qtplugin.cab"  \
                    classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B"> \
                <![endif]--> \
                <!--[if !IE]><--> \
                    <object id="'+id+'" type="'+opt.mimetype+'" \
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
                    rv.player = document[create_obj.mediaID] || document.getElementById(create_obj.mediaID);
                    rv.duration = document.getElementById(create_obj.durationID);
                    rv.elapsed = document.getElementById(create_obj.currentTimeID);
                    rv.timedisplay = document.getElementById('time-display');
                    rv.autoplay = create_obj.object.autoplay == 'true';
                } 
                return rv;
            } catch(e) {}
            return false;
        };
    }//Sherd.AssetViews.QuickTime
}


/*
			var args = ['images/poster.gif',
			  '320', '256', '',
			  'name','movie1',
			  'href','$!{material.url}',
			  'target','myself',
			  'type','image/x-quicktime',
			  'bgcolor','#ffffff',
			  'enablejavascript','true',
			  'controller','false',
			  'autoplay','true',
			  'autohref','true',
			  'kioskmode','true',
			  'pluginspage','http://www.apple.com/quicktime/download/',
			  'classid','clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B',
			  'codebase','http://www.apple.com/qtactivex/qtplugin.cab'];
			///Safari 3: does not do autohref successfully. why does it suck?
			if (/Macintosh.*3[.0-9]+ Safari/.test(navigator.userAgent)) {
			   args[0] = args[7];
			   args[11] = 'video/quicktime'; //type
			   args[17] = 'true'; //controller = true
			   args[21] = 'false'; //autohref=false
			   args.splice(6,2); //remove href
			}
			QT_WriteOBJECT_XHTML.apply(this,args);
 */



/**
 GENERATED HTML
    <div class="asset-display">
        <div id="quicktime-wrapper1" class="sherd-quicktime-wrapper">                
        <div id="clicktoplay" onclick="theMovie.SetURL(theMovie.GetHREF());hideElement(event.target)">Click video to play</div>                
        <!--[if IE]>
           <object id="movie1" width="320" height="256"                 
               style="behavior:url(#qt_event_source)"                  
               codebase="http://www.apple.com/qtactivex/qtplugin.cab"
               classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B">                 
        <[endif]-->
        
        <!--[if !IE]>
        <-->
        <object id="movie1" 
                type="image/x-quicktime" 
                data="http://openvaultresearch.wgbh.org:8080/fedora/get/wgbh:09591c7b709861e011e879ba73b11cb10b0f7ce8/sdef:THUMBNAIL/large" 
                height="256" 
                width="320">                  
        <!-- >
        <![endif]-->                 
            
            <param name="src" value="http://openvaultresearch.wgbh.org:8080/fedora/get/wgbh:09591c7b709861e011e879ba73b11cb10b0f7ce8/sdef:THUMBNAIL/large">                 
            <param name="controller" value="false">                 
            <param name="type" value="image/x-quicktime">                 
            <param name="enablejavascript" value="true">                 
            <param name="autoplay" value="false">                 
            <param name="href" value="http://openvaultresearch.wgbh.org:8080/fedora/get/wgbh:09591c7b709861e011e879ba73b11cb10b0f7ce8/StreamingProxy">
            <param name="autohref" value="false">
            <param name="width" value="320">
            <param name="height" value="256">
            <param name="target" value="myself">                                     
            Error text.
      </object>
      </div>   
 **/