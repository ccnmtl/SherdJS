/**
 * baseline video helper functions:
 * 
 * 
 * TODO: make sure overlapping seeks don't trip over each other
 * 
 */

if (typeof Sherd == 'undefined') {
    Sherd = {};
}
if (!Sherd.Video) {
    Sherd.Video = {};
}
if (!Sherd.Video.Helpers) {
    Sherd.Video.secondsToCode = function(seconds) {
        // second argument is the timecode object to be modified, otherwise
        // it'll create one
        var tc = {};
        intTime = Math.floor(seconds);
        tc.hr = parseInt(intTime / 3600);
        tc.min = parseInt((intTime % 3600) / 60);
        tc.sec = intTime % 60;
        tc.fraction = seconds - intTime;

        if (tc.hr < 10) {
            tc.hr = "0" + tc.hr;
        }
        if (tc.min < 10) {
            tc.min = "0" + tc.min;
        }
        if (tc.sec < 10) {
            tc.sec = "0" + tc.sec;
        }

        return tc.hr + ":" + tc.min + ":" + tc.sec;
    }

    Sherd.Video.codeToSeconds = function(code) {
        var mvscale = 1;
        // takes a timecode like '0:01:36:00.0' and turns it into # seconds
        var t = code.split(':');
        var x = t.pop();
        var seconds = 0;
        if (x.indexOf('.') >= 0) { // 00.0 format is for frames
            // ignore frames
            x = parseInt(t.pop());
        }
        var timeUnits = 1; // seconds -> minutes -> hours
        while (x || t.length > 0) {
            seconds += x * timeUnits * mvscale;
            timeUnits *= 60;
            x = parseInt(t.pop(), 10);
        }
        return seconds;
    }
    Sherd.Video.Helpers = function() {
        // helper functions
        this.secondsToCode = Sherd.Video.secondsToCode;
        this.codeToSeconds = Sherd.Video.codeToSeconds;
    }
}
if (!Sherd.Video.Base) {
    var noop = function() {
    };
    var unimplemented = function() {
        throw Error('unimplemented');
    };

    Sherd.Video.Base = function(options) {
        var self = this;
        Sherd.Video.Helpers.apply(this);
        Sherd.Base.AssetView.apply(this);

        this.options = {
            src : null,
            start : false,
            end : false,
            eventdispatch : {
                // events represent the completion of their name.
                // e.g. 'seek' means when a seek is successful
                'load' : noop,
                'unload' : noop,
                'firstplay' : noop,
                'play' : noop,
                'tick' : noop,
                'pause' : noop,
                'seek' : noop,
                'complete' : noop,
                'unsupported' : noop
            // ,
            }
        }

        this.start = false; // current/last seek time
        this.end = false; // current/last pause time
        this.seeking = false;

        this.paused = false;
        this.ended = false;
        this.ready = false;

        this.media = {
            load : unimplemented// (obj,start_from_scratch)
            ,
            unload : unimplemented,
            seek : unimplemented// (seconds,endtime)
            ,
            pause : unimplemented,
            pauseAt : unimplemented// (seconds)
            ,
            play : unimplemented

            // get information
            ,
            time : unimplemented// get current time in seconds
            ,
            timeCode: function() { // get current time as a time code string
                return self.secondsToCode(self.media.time());
            }

            ,
            duration : unimplemented// get duration in seconds
            ,
            timeStrip : unimplemented,
            isStreaming : function() {
                return false;
            }// true if we're sure it's streaming
        }

        this.microformat = {
            create : function(obj) { // Return the .html embed block for the embedded player 
                return ''
            },
            find : function(html_dom) { // Find embedded players. Note: Not currently in use.
                return [ {
                    html : html_dom
                } ]
            },
            read : function(found_obj) { // Return serialized description of embedded player. Note: Not currently in use.
                var obj;
                return obj;
            },
            remove: function() { // Destruction step. Note: Not Currently In Use
            },
            type: function() { var type; return type; }, // Return type of media. Note: Not currently in use;
            update: function(obj,html_dom) {}, // Replace the video identifier within the .html embed block 
            write: function(create_obj,html_dom) {} // Post-create step
        };

        // /BEGIN VITAL assumption -->relegate to quicktime.js when smarter
        this.play = function() {
            this.media.play();
        }

        // tell me where you are
        this.getState = function() {
            var state = {
                'start' : self.media.time()
            };
            state['default'] = (!state.start);
            state['duration'] = self.media.duration();
            state['timeScale'] = self.media.movscale;// correct after
                                                        // time()/duration()
                                                        // called
            return state;
        }

        // did you give me a start point - cue?
        // did you give me an end point -- pause at that end point or jump to
        // the end point if you're past that point
        // if not loaded -- then do this as soon as you load (if ready)
        this.setState = function(obj) {
            if (typeof obj == 'object') {
                this.media.seek(obj.start, obj.end);
            }
        }
        // /END VITAL-specific

        this.get = function() {
            return self.components['media'];
        }

        // convenience functions
        this.write = function(obj) {
            this.html.write(this.microformat.create(obj));
        }

        if (!this.events) {
            this.events = {};
        }
        this.events.fired = {
            'load' : false,
            'unload' : false,
            'firstplay' : false,
            'pause' : false,
            'firstcomplete' : false,
            'unsupported' : false
        }
        this.events._waiters = {};
        this.events.wait = function(event, waiter) {
            var w = this.events._waiters;
            if (!w[event])
                w[event] = [];
            w[event].push(waiter);
        }
        this.events.fire = function(event) {
            this.events.fired[event] = true;
            var w = this.event._waiters;
            if (w[event]) {
                var m;
                while (m = w[event].shift()) {
                    m.trigger(event);
                }
            }
        }

        /*
         * queue() takes a plan of tasks and will perform one after another with
         * the opportunity to keep trying a step until it's ready to proceed
         * @plan array of objects of the form: {data:'Queue dispatch'//passed to
         * all calls, but useful as a name, too ,call:function(){}//called
         * initially in sequence-- ,check:media.GetDuration ,test:function(){}
         * ,poll:100//msecs will keep trying until test(check()) returns true
         * ,callback:function(){}//if test(check()) returns true, this function
         * will be called //UNIMPLEMENTED--need some thought on where events get
         * registered, etc. ,event:'load' //will listen for this event to call
         * test(check()), parallel to polling ,broadcast:'seek' //event sent
         * when test(check())==true }; with all
         */
        this.events.queue = function queue(name, plan) {

            var current = -1;
            if (plan.length) {
                var next;
                var cur;
                var pollID;
                var timeoutID;

                //TODO: event, broadcast attrs
                function advance() {
                    if (pollID)
                        window.clearTimeout(pollID);
                    if (timeoutID)
                        window.clearTimeout(timeoutID);
                    ++current;
                    if (plan.length > current) {
                        cur = plan[current];
                        next();
                    }
                }
                next = function() {
                    var fired = false;
                    var self = (cur.self) ? cur.self : this;
                    try {
                        if (cur.call)
                            cur.call.apply(self);
                    } catch (e) {
                        if (cur.log)
                            cur.log.apply(self, [ e, 'call failed' ]);
                    }
                    function go() {
                        if (fired) {
                            advance();
                            return;
                        }
                        var v = null;
                        var rv = true;
                        var data = (typeof cur.data != 'undefined') ? cur.data
                                : '';
                        try {
                            if (cur.check)
                                v = cur.check.apply(self, [ data ]);
                            if (cur.test) {
                                rv = cur.test.apply(self, [ v, data ]);
                            }
                            if (cur.log)
                                cur.log.apply(self, [ [ v, rv, data ] ]);
                            if (rv) {
                                if (cur.callback) {
                                    cur.callback.apply(self, [ rv, data ]);
                                }
                                fired = true;
                                advance();
                            } else if (cur.poll)
                                pollID = window.setTimeout(arguments.callee,
                                        cur.poll);
                        } catch (e) {
                            if (cur.poll)
                                pollID = window.setTimeout(arguments.callee,
                                        cur.poll);
                            if (cur.log)
                                cur.log.apply(self, [ e, data ]);
                        }
                    }
                    if (cur.check || cur.poll || cur.test)
                        pollID = window.setTimeout(go, 0);
                    else
                        advance();
                    if (cur.timeout) {
                        window.setTimeout(function() {
                            fired = true;
                            advance();
                        }, cur.timeout);
                    }
                }//next()
                advance();
            }
        }//event.queue()
    };//Sherd.Video.Base
}
