/*
  support for the YouTube js-enabled player.  documentation at:
  http://code.google.com/apis/youtube/js_api_reference.html
  http://code.google.com/apis/youtube/chromeless_example_1.html

  TODO: UNREQUIRE  dependency: Clipper() WaitUntil()
  TODO: implement AssetView
*/

function YouTubeClipper(obj_id, target) {
    this.obj_id = obj_id;

    this.pause_once = [];

    if (!(obj_id in YouTubeClipper.instances) ) {
	YouTubeClipper.instances[obj_id] = [];
    }
    this.instance_index = YouTubeClipper.instances[obj_id].push(this)-1;
}

YouTubeClipper.ready = {};
YouTubeClipper.instances = {};

YouTubeClipper.annotatable = function(obj) {
    var yes = false;
    switch (obj.tagName.toLowerCase()) {
    case 'embed':
	var src = obj.getAttribute('src');
	yes = /enablejsapi=1/.test(src);
	break;
    case 'object':
	var movieParam = function(o){return (o.name=='movie')?o.value:null;};
	var movie = jQuery.map(obj.getElementsByTagName('param'),movieParam);
	if (movie.length) {	
	    yes = /enablejsapi=1/.test(movie);
	}
	break;
    }
    //used in a jQuery.map() call
    return (yes)?obj:null;
    /* isn't loaded yet :-(
    return (typeof(obj.getCurrentTime) == 'function'
	    && typeof(obj.seekTo) == 'function'
	    )?obj:null;
    */
}

YouTubeClipper.thisMovie = function(movieName) {
    if (typeof(document[movieName]) != 'undefined') {
	return document[movieName];
    } else {
	return window[movieName];
    }
    /*
    if(navigator.appName.indexOf("Microsoft") != -1) {
	return window[movieName];
    } else {
	return document[movieName];
    }
    */
}

///for YouTubeClipper instances
YouTubeClipper.prototype.movie = function() {
    return YouTubeClipper.thisMovie(this.obj_id);
}

YouTubeClipper.prototype.GetTime = function() {
    //should we round to integer here?
    return Math.round(this.movie().getCurrentTime());
}
YouTubeClipper.prototype.GetDuration = function() {
    return this.movie().getDuration();
}

YouTubeClipper.prototype.GetTimeCode = function() {
    return Clipper.intToCode(this.GetTime());
}

YouTubeClipper.prototype.loaded = function() {
    if (typeof(YouTubeClipper.ready[this.obj_id]) == 'undefined') {
	throw "flash object not yet loaded";
    }
    return true;
}

///valid duration is available
YouTubeClipper.prototype.durable = function() {
    var self = this;
    if (self.GetDuration() <= 0) {
	throw "not long enough!";
    }
    return true;
}

YouTubeClipper.prototype.LoadAt = function(seconds) {
    var self = this;
    var w = new WaitUntil(function() {
	if (self.loaded()) {
	    self._SetTime(seconds);
	}
    },100,self);
}

YouTubeClipper.prototype.Play = function() {
    this.movie().playVideo();
}

YouTubeClipper.prototype._PauseOnce = function() {
    var self = this;
    var movie = self.movie();
    var state = movie.getPlayerState();
    if (self.pause_once.length && state == 1) {
	//self.pause_once = false;
	var secs = self.pause_once.pop();
	self.Pause();
	if (self.pause_once.length == 0) {
	    movie.unMute();
	}
    }
}

YouTubeClipper.prototype.Pause = function() {
    this.movie().pauseVideo();
}

YouTubeClipper.prototype._SetTime = function(seconds) {
    //second argument disregards how far the video has loaded
    /* Wow, seekTo() sucks!  seek auto-plays and auto-unMutes.
     */
    var self = this;
    var movie = self.movie();
    var state = movie.getPlayerState();
    if (state != 1) {
	movie.mute();
	/*Why an array, you ask?  because once is not enough.  you have to Pause it twice!
	 */
	self.pause_once = [seconds,seconds];
	movie.addEventListener("onStateChange", 'YouTubeClipper.instances["'+self.obj_id+'"]['+self.instance_index+']["_PauseOnce"]');
    }
    movie.seekTo(seconds, true);
}

YouTubeClipper.prototype.SetTime = function(seconds) {
    var self = this;
    try {
	if (self.loaded()) {
	    self._SetTime(seconds);
	}
    }
    catch(e) {
	self.LoadAt(seconds);
    }
}

YouTubeClipper.prototype.PauseAt = function(seconds) {
    var self = this;
    var w = new WaitUntil(function() {
	var time = self.GetTime();
	if (time >= seconds) {
	    self.Pause();
	    return true;
	}
	throw "not yet at the given time";
    }, 500, self);
}

YouTubeClipper.prototype.TimeStrip = function() {
    var width = 234;
    try {
	var dur = this.GetDuration();
	if (dur >=600) {
	    ///when over 10 minutes we get an extra digit
	    width -= 15;
	}
    } catch(e) {/*must be too early*/}
    return {
	w:width,
	x:42,
	visible:true
    };
}

function onYouTubePlayerReady(playerId) {
    YouTubeClipper.ready[playerId] = true;
}

//REGISTER with Clipper
//Clipper.clippers['youtube'] = YouTubeClipper;
