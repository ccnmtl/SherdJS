var CLIP_MARKER_WIDTH = 7;

function DjangoSherd_ClipStrip() {
    var self = this;
    Sherd.Base.AssetView.apply(this, arguments); // inherit

    this.attachView = function(view) {
        this.targetview = view;
    }

    this.getState = function() {
        var obj = {};
        // not sure what's needed here
        return obj;
    }

    this.setState = function(obj) {
        if (typeof obj == 'object') {
            self.components.starttime = 0;
            self.components.endtime = obj.duration;
            if (obj.start) {
                self.components.starttime = obj.start
            }
            if (obj.end) {
                self.components.endtime = obj.end;
            }
            if (obj.duration < 1) {
                // listen for an event -- video duration is available
            } else {
                left = self.utilities.timeToPixels(self.components.starttime, obj.duration, self.components.timestrip.trackWidth);
                right = self.utilities.timeToPixels(self.components.endtime, obj.duration, self.components.timestrip.trackWidth);
                
                self.components.clipStartMarker.style.left = (left - CLIP_MARKER_WIDTH) + 'px';
                self.components.clipEndMarker.style.left = right + 'px';
                self.components.clipRange.style.left = left + "px";
                self.components.clipRange.style.width = (right - left) + 'px';
                
                self.components.clipStartMarker.style.display = 'block';
                self.components.clipRange.style.display = 'block';
                self.components.clipEndMarker.style.display = 'block';
            }
            return true;
        }
    }

    this.initialize = function() {
        // MochiKit!!!
        connect(self.components.clipStartMarker, 'onclick', function(evt) {
                self.targetview.media.seek(self.components.starttime);
             });
        connect(self.components.clipEndMarker, 'onclick', function(evt) {
                self.targetview.media.seek(self.components.endtime);
            });
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
    
    // Post-create step. Overriding here to do a component create
    this.microformat.postcreate = function(create_obj, html_dom) {
        if (create_obj) {
            var top = document.getElementById(create_obj.htmlID);
            self.components = self.microformat.components(top,create_obj);
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
            }
        } catch(e) {}
        return false;
    }
    
    this.utilities = {
       timeToPixels: function(seconds, duration, width) {
           if (duration > 0) {
               var ratio = width / duration;
               return ratio * seconds;
           } else {
               return 0;
           }
       }
    }
}
