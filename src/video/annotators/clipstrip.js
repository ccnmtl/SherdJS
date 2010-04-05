//
// Use Cases:
// Default 
// -- starttime:0, endtime:0, duration:0 
// -- left/right markers appear together at the 0px position, left-side of player
//
// Start & Duration 
// -- starttime:x, endtime:undefined, duration:y 
// -- endtime defaults to starttime -- left/right markers appear together at the start position  
// >>> This case is from a queryString start parameter 
//
// Start & End & Duration
// -- startime: x, endtime: y, duration: z
// -- Markers appear at start/end times appropriately
//
// Listens for: 
// duration: changes in duration from the movie player. Some players don't get duration until playback begins
//           the clipstrip will resize itself appropriately when the correct data is received.
//      
// clipstart: changes in the clipstart from the clipform
// clipend: changes in the clipend from the clipform
//
// Signals:
// seek: when a user clicks on the start/end time of the clipstrip, sends a seek event out
//


if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.Annotators) {Sherd.Video.Annotators= {};}
if (!Sherd.Video.Annotators.ClipStrip) {
 Sherd.Video.Annotators.ClipStrip = function() {
    var self = this;
    var CLIP_MARKER_WIDTH = 7;

    Sherd.Base.AssetView.apply(this, arguments); // inherit

    this.attachView = function(view) {
        this.targetview = view;
    }

    this.getState = function() {
        var obj = {};
        
        obj.starttime = self.components.starttime;
        obj.endtime = self.components.endtime;
        obj.duration = self.components.duration;
        obj.timestrip = self.components.timestrip;
        return obj;
    }

    this.setState = function(obj) {
        if (typeof obj == 'object') {
            
            if (obj.start)
                self.components.starttime = obj.start
            else
                self.components.starttime = 0;
            
            if (obj.end)
                self.components.endtime = obj.end;
            else 
                self.components.endtime = self.components.starttime;
            
            if (obj.duration > 1) {
                self.components.duration = obj.duration
                self.microformat._resize();
            }
            return true;
        }
    }
    
    // Event Listener: duration - from player
    // Assumes start & end times have been initialized through setState or are defaulted
    this.setClipDuration = function(obj) {
        if (obj.duration > 1) {
            self.components.duration = obj.duration;
            self.microformat._resize();
        }
    }
    
    // Event Listener: clipstart - from clipform
    // Assumes self.components.duration has been initialized either through setState or setClipDuration
    this.setClipStart = function(obj) {
        if (obj.start != undefined && self.components.duration) {
            self.components.starttime = obj.start;
            self.microformat._resize();
        }
    }
    
    // Event Listener: clipend - from clipform
    // Assumes self.components.duration has been initialized
    this.setClipEnd = function(obj) {
        if (obj.end != undefined && self.components.duration) {
            self.components.endtime = obj.end;
            self.microformat._resize();
        }
    }

    this.initialize = function(create_obj) {
        // MochiKit!!!
        connect(self.components.clipStartMarker, 'onclick', function(evt) {
                self.events.signal(djangosherd, 'seek', self.components.starttime);
             });
        connect(self.components.clipEndMarker, 'onclick', function(evt) {
                self.events.signal(djangosherd, 'seek', self.components.endtime);
            });
        connect(self.components.clipRange, 'onclick', function(evt) {
            var obj = self.getState();
            self.events.signal(djangosherd, 'playclip', { start: obj.starttime, end: obj.endtime });
        });
    
        
        // listen for changes in duration from the movie and clipstart/end changes from clipform
        self.events.connect(djangosherd, 'duration', self, 'setClipDuration'); //player
        self.events.connect(djangosherd, 'clipstart', self, 'setClipStart'); //clipform
        self.events.connect(djangosherd, 'clipend', self, 'setClipEnd'); //clipform
        
        // setup the clip markers in the default position
        self.microformat._resize();
    }
    
    this.microformat.create = function(obj) {
        var htmlID = 'clipStrip';
        timestrip = self.targetview.media.timestrip();
        return {
            htmlID : htmlID,
            timestrip : timestrip,
            text : '<div id="clipStrip" style="width: ' + timestrip.w + 'px">' + 
                        '<div id="clipStripTrack"  style="width: ' + timestrip.trackWidth + 'px; left: ' + timestrip.trackX + 'px">' + 
                            '<div id="clipStripStart" class="clipSlider" onmouseover="return escape(\'Go to note start time\')" style="display:none"></div>' + 
                            '<div id="clipStripRange" class="clipStripRange" style="display:none"></div>' + 
                            '<div id="clipStripEnd" class="noteStripEnd" onmouseover="return escape(\'Go to note end time\')" style="display:none"></div>' + 
                        '</div>' + 
                    '</div>'
        }
    }
    
    // self.components -- Access to the internal player and any options needed at runtime
    this.microformat.components = function(html_dom,create_obj) {
        try {
            return {
                clipStrip : document.getElementById('clipStrip'),
                clipStartMarker : document.getElementById('clipStripStart'),
                clipRange : document.getElementById('clipStripRange'),
                clipEndMarker : document.getElementById('clipStripEnd'),
                timestrip: create_obj.timestrip,
                starttime: 0,
                endtime: 0,
                duration: 0
            }
        } catch(e) {}
        return false;
    }
    
    this.microformat._resize = function() {
        left = self.microformat._timeToPixels(self.components.starttime, self.components.duration, self.components.timestrip.trackWidth);
        right = self.microformat._timeToPixels(self.components.endtime, self.components.duration, self.components.timestrip.trackWidth);
        width = right - left;
        if (width < 0) width = 0;
        
        self.components.clipStartMarker.style.left = (left - CLIP_MARKER_WIDTH) + 'px';
        self.components.clipEndMarker.style.left = right + 'px';
        self.components.clipRange.style.left = left + "px";
        self.components.clipRange.style.width = width + 'px';
        
        self.components.clipStartMarker.style.display = 'block';
        self.components.clipRange.style.display = 'block';
        self.components.clipEndMarker.style.display = 'block';
    }
    
    this.microformat._timeToPixels = function(seconds, duration, width) {
       if (duration > 0) {
           var ratio = width / duration;
           return ratio * seconds;
       } else {
           return 0;
       }
    }
 };

}