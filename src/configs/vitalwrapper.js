///interfaces:


///videonoteform
///1. update noteform field: DjangoSherd_UpdateHack()
///2. initialize videonoteform field vals
///3. onchange of text fields in videonoteform to run: DjangoSherd_UpdateHack
///4. on tab-change, set startTime (and from that run DjangoSherd_UpdateHack)

// Listens for:
//
// Signals:
// clipstart - the clip start time has changed. signals self.targetview.media
// clipend -- the clip end time has changed. signals self.targetview.media




function DjangoSherd_ClipForm() {
    var secondsToCode = Sherd.Video.secondsToCode;
    var codeToSeconds = Sherd.Video.codeToSeconds;
    var nofraction = true;
    var self = this;
    // Sherd.Video.Annotators.FormFragment.apply(this,arguments);//inherit
    Sherd.Base.AssetView.apply(this, arguments);// inherit

    // TODO: when create-clip is tabbed to, we also need to gettime/pause
    this._asset = {};// to be 'true'
    this.targetstorage = [];

    // /will this work? this is all so hacky!
    this.attachView = function(view) {
        this.targetview = view;
    }
    this.addStorage = function(stor) {
        this.targetstorage.push(stor);
    }

    this.getState = function() {
        var duration = self.targetview.media.duration();
        var timeScale = self.targetview.media.timescale();
        
        var obj = {
            'startCode' : self.components.startField.value,
            'endCode' : self.components.endField.value,
            'duration' : duration,
            'timeScale' : timeScale
        };
        obj.start = codeToSeconds(obj.startCode);
        obj.end = codeToSeconds(obj.endCode);
        obj['default'] = (obj.start == 0 && obj.end == 0);
       
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
                self.events.signal(self.targetview.media, 'clipstart', { start: codeToSeconds(start) });    
            
            if (end)
                self.events.signal(self.targetview.media, 'clipend', { end: codeToSeconds(end) });
        }
    }

    this.storage = {
        update : function(obj, just_downstream) {
            if (!just_downstream) {
                self.setState(obj);
            }
            for ( var i = 0; i < self.targetstorage.length; i++) {
                self.targetstorage[i].storage.update(obj);
            }
        }
    }

    this.initialize = function(create_obj) {
        // MochiKit!!!
        connect(self.components.startButton, 'onclick', function(evt) {
                //if (self.targetview.media.isPlaying()) { // movie is playing
                    self.components.startField.value = self.targetview.media.timeCode(); // update start time with movie time
                //}
                //else { // movie is paused
                //    self.targetview.play(); // play the movie if it is paused
                //}
                if (self.targetview.media.time() > codeToSeconds(self.components.endField.value))
                    self.components.endField.value = self.targetview.media.timeCode(); // update end time if start time is greater
                
                self.storage.update(self.getState(), false);
            });
        connect(self.components.endButton, 'onclick', function(evt) {
                //if (self.targetview.media.isPlaying()) // movie is playing
                //    self.targetview.media.pause(); // stop the movie if it is playing
                
                self.components.endField.value = self.targetview.media.timeCode(); // update the end time with movie time
                
                // if the start time is greater then the endtime, make start time match end time
                if (self.targetview.media.time() < codeToSeconds(self.components.startField.value)) 
                    self.components.startField.value = self.targetview.media.timeCode();
                
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

    this.queryformat = {
        create : function(obj) {
            return ''
        },
        find : function(str) {
            var start_point = String(str).match(/start=([.\d]+)/);
            if (start_point != null) {
                var start = Number(start_point[1]);
                if (!isNaN(start)) {
                    return [ {
                        start : start
                    } ];
                }
            }
            return [];
        },
        read : function(found_obj) {
            found_obj.startCode = secondsToCode(found_obj.start);
            return found_obj;
        }
    }

    this.microformat = {
        create : function(obj) {
            var htmlID = 'vitalcrap1';
            return {
                htmlID : htmlID,
                text : '<div id="' + htmlID + '"><div class="vitalcrap" style="display:none">\
                	       <input type="radio" name="clipType" value="Clip" checked="checked" />\
                	       <input type="radio" name="clipType" value="Marker"/>\
                	    </div>\
                  	    <div id="clipcontrols"><!--stolen from vital-->\
                	       <div class="cliptimeboxtable" style="width: 320px;">\
                	          <table border="0" cellspacing="0" cellpadding="0">\
                	              <tr>\
                        		  <td style="padding: 2px;"><input type="button" class="regButton" style="width: 70px" value="start time:" /></td>\
                        		  <td style="padding: 2px 10px 2px 2px; border-right: 1px dotted #999;">\
                        		    <input type="text" class="timecode" name="clipBegin" value="00:00:00" /></td><!-- Do not change the name "clipBegin" -->\
                        		    <td style="padding: 2px 2px 2px 7px;"><input type="button" class="regButton" style="width: 70px" value="end time:" /></td>\
                        		    <td style="padding: 2px;">\
                        		      <input type="text" class="timecode" name="clipEnd" value="00:00:00" /></td><!-- Do not change the name "clipEnd" -->\
                        		</tr>\
                              </table>\
                	      </div>\
                	    </div></div>'
            };
        },//create function
        components : function(html_dom, create_obj) {
            var inputs = html_dom.getElementsByTagName('input');
            return {
                'form' : html_dom,
                'startButton' : inputs[2],
                'endButton' : inputs[4],
                'startField' : inputs[3],
                'endField' : inputs[5]
            }
        }
    }//microformat

}
