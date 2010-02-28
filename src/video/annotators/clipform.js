///clipform-display
///1. update noteform field: DjangoSherd_UpdateHack()
///2. initialize clipform field vals
///3. onchange of text fields in clipform to run: DjangoSherd_UpdateHack
///4. on tab-change, set startTime (and from that run DjangoSherd_UpdateHack)

// Listens for:
// Nothing
// 
// Signals:
// clipstart - the clip start time has changed. signals self.targetview.media
// clipend -- the clip end time has changed. signals self.targetview.media

function DjangoSherd_ClipForm() {
    var secondsToCode = Sherd.Video.secondsToCode; // @todo -- consider moving these functions out of Video  
    var codeToSeconds = Sherd.Video.codeToSeconds; // and into a separate Utilities or Helpers file?
    
    var self = this;
    Sherd.Base.AssetView.apply(this, arguments);// inherit
    
    this.attachView = function(view) {
        this.targetview = view;
    }
    
    this.targetstorage = [];
    this.addStorage = function(stor) {
        this.targetstorage.push(stor);
    }

    // @todo -- this getState is what is used for storing
    // all the data about the video. would be better if
    // it were a compilation of information from both clipform & player itself
    // eg. duration & timescale aren't clipform properties
    this.getState = function() {
        var duration = self.targetview.media.duration();
        var timeScale = self.targetview.media.timescale();
        
        var obj = {
            'startCode' : self.components.startField.value,
            'endCode' : self.components.endField.value,
            'duration' : duration,
            'timeScale' : timeScale,
            'start' : codeToSeconds(self.components.startField.value),
            'end' : codeToSeconds(self.components.endField.value),
        };
       
        return obj;
    }

    this.setState = function(obj) {
        if (typeof obj == 'object') {
            
            var start;
            if (obj.startCode) {
                start = self.components.startField.value = obj.startCode;
            } else if (obj.start) {
                start = self.components.startField.value = secondsToCode(obj.start);
            }
            
            var end;
            if (obj.endCode) {
                end = self.components.endField.value = obj.endCode;
            } else if (obj.end) {
                end = self.components.endField.value = secondsToCode(obj.end);
            } else if (start) {
                self.components.endField.value = start;
                end = start;
            }
            
            if (start)
                self.events.signal(djangosherd, 'clipstart', { start: codeToSeconds(start) });    
            
            if (end)
                self.events.signal(djangosherd, 'clipend', { end: codeToSeconds(end) });
        }
    }

    this.storage = {
        update : function(obj, just_downstream) {
            if (!just_downstream) {
                self.setState(obj);
            }
            if (self.targetstorage) {
                for ( var i = 0; i < self.targetstorage.length; i++) {
                    self.targetstorage[i].storage.update(obj);
                }
            }
        }
    }

    this.initialize = function(create_obj) {
        // MochiKit!!!
        connect(self.components.startButton, 'onclick', function(evt) {
                var movieTime = self.targetview.media.time();
                var movieTimeCode = secondsToCode(movieTime);
                
                self.components.startField.value = movieTimeCode; // update start time with movie time
                
                if (movieTime > codeToSeconds(self.components.endField.value))
                    self.components.endField.value = movieTimeCode; // update end time if start time is greater
                
                self.storage.update(self.getState(), false);
            });
        connect(self.components.endButton, 'onclick', function(evt) {
                var movieTime = self.targetview.media.time();
                var movieTimeCode = secondsToCode(movieTime);
            
                self.components.endField.value = movieTimeCode; // update the end time with movie time
                
                // if the start time is greater then the endtime, make start time match end time
                if (movieTime < codeToSeconds(self.components.startField.value)) 
                    self.components.startField.value = movieTimeCode;
                
                self.storage.update(self.getState(), false);
            });
        connect(self.components.startField, 'onchange', function(evt) {
            var obj = self.getState();

            // if the start time is greater then the endtime, make end time match start time
            if (obj.end < obj.start) {
                obj.end = obj.start;
                obj.endCode = obj.startCode;
                self.components.endField.value = obj.startCode;// HTML
            }
            self.storage.update(obj, false);
        });
        connect(self.components.endField, 'onchange', function(evt) {
            var obj = self.getState();

            // if the start time is greater then the endtime, make start time match end time
            if (obj.end < obj.start) {
                obj.start = obj.end;
                obj.startCode = obj.endCode;
                self.components.startField.value = obj.endCode;// HTML
            }
            self.storage.update(obj, false);
        });
    }
    
    this.microformat.create = function(obj) {
        var htmlID = 'clipform';
        return {
            htmlID : htmlID,
            text : '<div id="' + htmlID + '"><div class="clipform" style="display:none">\
                       <input type="radio" name="clipType" value="Clip" checked="checked" />\
                       <input type="radio" name="clipType" value="Marker"/>\
                    </div>\
                    <div id="clipcontrols">\
                       <div class="cliptimeboxtable" style="width: 320px;">\
                          <table border="0" cellspacing="0" cellpadding="0">\
                              <tr>\
                              <td style="padding: 2px;"><input type="button" class="regButton" style="width: 70px" value="start time:" id="btnClipStart"/></td>\
                              <td style="padding: 2px 10px 2px 2px; border-right: 1px dotted #999;">\
                                <input type="text" class="timecode" id="clipStart" value="00:00:00" /></td>\
                                <td style="padding: 2px 2px 2px 7px;"><input type="button" class="regButton" style="width: 70px" value="end time:" id="btnClipEnd"/></td>\
                                <td style="padding: 2px;">\
                                  <input type="text" class="timecode" id="clipEnd" value="00:00:00" /></td>\
                            </tr>\
                          </table>\
                      </div>\
                    </div></div>'
        }
    }
    
    this.microformat.components = function(html_dom, create_obj) 
    {
        var inputs = html_dom.getElementsByTagName('input');
        return {
            'form' : html_dom,
            'startButton' : inputs[2],
            'endButton' : inputs[4],
            'startField' : inputs[3],
            'endField' : inputs[5]
        }
    }
}
