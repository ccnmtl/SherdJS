/**********
 * display strip underneath time line.
 * This is mostly stolen inspired from (my code in) the VITAL project

  TODO UNREQUIRE: jQuery 
  TODO IMPLEMENT: AssetLayer

  TODO IMPLEMENT:
    * need to create annotation objects
    * need to listen for events
    1. multiple annotations
    2. editable annotations (by dragging)
  video_interface.get() returns the DOMobj for the video //used to be movie()
  video_interface.GetDuration() returns duration (in seconds)
  video_interface.TimeStrip() returns {x:OFFSET,w:WIDTH,visible:TRUE}
 
  video annotation object:
  {view:{
      color:'white'
   }
   annotations:[ {start:<seconds>, end:<seconds>}
   ]
  }
 *********/

function ClipStrip() {
    Sherd.Base.DomObject.call(this);//inherit
    this.supports = {
	multiple_annotations:false, creatable:false, editable:false, extra_fields:false
    }

    var self = this; //for binding when necessary
    var _video;
    var _storage;
    var _ready;
    this.options = {
	//connected to the width of the bookend*.gif files in the styling
	CLIP_MARKER_WIDTH:7
    }
    function _default_LayerMicroformat() {
	var self = this;
	this.type = function(){return 'clipstrip'};
	this.write = function(obj,doc) {
	    doc = (doc)?doc:document;
	    var dom = doc.createElement('div');
	    dom.setAttribute('class','clipStrip');
	    dom.innerHTML = '<div class="clipStripLabel"><!-- nothing --></div><div class="clipStripTrack"><div class="clipStripStart clipSlider" style="display:none"></div><div class="clipStripRange" style="display:none"></div><div class="clipStripEnd" style="display:none"></div></div>';
	    return dom;
	};
	this.components=function(html_dom) {
	    var rv =  {
		'top':html_dom,
		'clipStripTrack':jQuery('.clipStripTrack',html_dom).get(0),
		'clipStripTarget':jQuery('.clipStripTrack',html_dom).get(0),
		'clipStripStart': jQuery('.clipStripStart',html_dom).get(0),
		'clipStripRange': jQuery('.clipStripRange',html_dom).get(0),
		'clipStripEnd':jQuery('.clipStripEnd',html_dom).get(0)
	    };
	    rv.clipStripLength = self.length(rv);
	    return rv;
	};
	//custom
	this.length=function(components) {
	    return parseInt(components.clipStripTarget.offsetWidth,10);
	};
    }

    this.attachMicroformat(new _default_LayerMicroformat()); //default


    ///NOT USED YET: FUTURE: for multiple annotations
    function _default_AnnotationMicroformat() {
	var self = this;
	this.type = function(){return 'annotation/video'};
	this.write = function(obj,doc) {
	    doc = (doc)?doc:document;
	    var dom = doc.createElement('div');
	    dom.setAttribute('class','clipStripAnnotation');
	    dom.innerHTML = '<div class="clipStripStart clipSlider" style="display:none"></div><div class="clipStripRange" style="display:none"></div><div class="clipStripEnd" style="display:none"></div>';
	    return dom;
	};
	this.components=function(html_dom) {
	    var rv =  {
		'top':html_dom,
		'clipStripStart': jQuery('.clipStripStart',html_dom).get(0),
		'clipStripRange': jQuery('.clipStripRange',html_dom).get(0),
		'clipStripEnd':jQuery('.clipStripEnd',html_dom).get(0)
	    };
	    rv.clipStripLength = self.length(rv);
	    return rv;
	};
	//custom
	this.length=function(components) {
	    return parseInt(components.clipStripRange.offsetWidth,10);
	};
    }


    this.positionStrip = function(components) {
	var dim = _video.TimeStrip();
	this.components.top.style.paddingRight=dim.x+'px';
	this.components.top.style.width=dim.w+'px';

	this.components.clipStripTrack.style.left=dim.x+'px';
	this.components.clipStripTrack.style.width=dim.w+'px';
	
	this.components.clipStripLength = dim.w;
    }
    this.clipStripPos = function(timeCodeSeconds) {
	try {
	    this.movDuration = _video.GetDuration();
	} catch(err) {/*who cares?*/}
	var ratio = this.components.clipStripLength/this.movDuration;
	return Math.floor(ratio * timeCodeSeconds);
    }
    //setup up layer
    this.initialize = function() {
	var microformat = this.microformat();
	var html_dom = microformat.write();
	html_dom = _video.html(html_dom, this, null, 'clipstrip');
	//should some/all of this be above the html() call?
	if (html_dom) {//place strip
	    this.components = microformat.components(html_dom);
	    this.positionStrip(this.components);
	    jQuery(_video.get()).after(html_dom);
	}
	if (this.options.createable) {
	    //TODO:add dom
	    //TODO:add listener
	}
	if (_storage && !_ready) {
	    _storage.ready();
	    _ready = true;
	}
    }
    this.get = function() {return this.components.top;}
    this.attachView = function(view, options) {
	if (_video) {
	    //TODO: stop listening to current view
	}
	_video = view;
	if (options) {
	    for (a in options) {
		this.options[a] = options[a];
	    }
	}
	this.initialize();

	//TODO:start listening to view
    }
    this.attachStorage = function(storage) {
	if (_storage) {
	    //TODO: stop listening to current storage
	}
	_storage = storage;
	if (!_ready) {
	    _storage.ready();
	    _ready = true;
	}
	//TODO: start listening to storage
    }


    //public interface?
    this.annotations = {
	'create':function(ann){
	    return self.annotations.update(ann);
	},
	'update':function(ann){
	    //just one for now
	    if(ann.annotations.length) {
		var left = self.clipStripPos(obj.annotations[0].start);
		var right = self.clipStripPos(obj.annotations[0].end);

		self.components.clipStripStart.style.left = parseInt(left-self.options.CLIP_MARKER_WIDTH+2,10)+'px';
		self.components.clipStripRange.style.left = left+'px';
		self.components.clipStripRange.style.width = parseInt(right-left,10)+'px';
		self.components.clipStripEnd.style.left = right+'px';
	
		self.components.clipStripStart.style.display = 'block';
		self.components.clipStripRange.style.display = 'block';
		self.components.clipStripEnd.style.display = 'block';

	    }
	},
	'focus':function(annId){},
	'hide':function(annId){
	    self.components.clipStripStart.style.display='none';
	    self.components.clipStripRange.style.display='none';
	    self.components.clipStripEnd.style.display='none';
	},
	'show':function(annId){
	    self.components.clipStripStart.style.display = 'block';
	    self.components.clipStripRange.style.display = 'block';
	    self.components.clipStripEnd.style.display = 'block';
	},
	'remove':function(annId){
	    self.annotations.hide(annId);
	},
	'microformat':new _default_AnnotationMicroformat()
    };//this.annotations

    //STORAGE: only necessary once we are editable
    function save(ann) {
	_storage.save(ann,this);
    }
    function remove(ann) {
	_storage.remove(ann,this);
    }

    //VIEW
    function fakeFunction() {
	//setting up annotation
	var ann_dom = this.annotations.microformat().write(ann);
	ann_dom = _video.html(ann_dom, this, ann, 'annotation');
	if (ann_dom) {
	    //place annotation
	}
	_video.html(this.microformat().write() );
    }



}