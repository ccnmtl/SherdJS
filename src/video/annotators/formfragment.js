if (typeof Sherd == 'undefined') {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.Annotators) {Sherd.Video.Annotators = {};}
if (!Sherd.Video.Annotators.FormFragment) {
    Sherd.Video.Annotators.FormFragment = function () {
	var self = this;
	Sherd.Base.DomObject.apply(this,arguments);//inherit dom properties
	Sherd.AssetLayer.apply(this,arguments);//inherit addView, etc.
	Sherd.Video.Helpers.apply(this);//mixin


	this.attachView = function(view) {
	    this.media = view.media;
	}

	///TODO: get rid of this, and adapt the whole thing
	this.html = {
	    put: function(dom) {
		//self.components['form'] = dom;//do we need this?
		var obj = self.microformat.create(null);
		dom.appendChild(obj.html);
		self.components = self.microformat.components(obj);
		if (self.controller) {
		    self.controller.initialize();
		}
	    }
	}
	
	if (!this.defaults) this.defaults={};
	this.defaults.FormFragment = {
	    ///Microformat
	    ///
	    microformat:function _default_Microformat() {
		this.type = function() {return 'feature'};
		this.read = function(found_obj) {
		    var comp=self.microformat.components(found_obj);
		    if (!self.components) self.components = comp;
		    return {'start':self.codeToSeconds(comp.startField),
			    'startCode':comp.startField,
			    'end':self.codeToSeconds(comp.endField),
			    'endCode':self.codeToSeconds(comp.endField)
			   };
		};
		this.create = function(obj,doc) {
		    var fobj = {};
		    fobj.html = Sherd.Base.html2dom('<div><input class="regButton" type="button" value="set Start" /><input class="timecode" type="text" size="9" value="00:00:00" /><input class="regButton" type="button" value="set End" /><input class="timecode" type="text" size="9" value="00:00:00" /></div>',doc);
		    self.microformat.update(obj,fobj); //alters fobj.html
		    return fobj; //note, this does not insert it
		};
		this.update = function(obj,found_obj) {
		    var comp=self.microformat.components(found_obj);
		    if (!self.components) self.components = comp;
		    if (obj && obj != null) {
			if (obj.startCode)
			    comp.startField.value = obj.startCode;
			if (obj.endCode)
			    comp.endField.value = obj.endCode;
		    }
		};
		this.components = function(found_obj) {
		    //if (self.components) return self.components;
		    if (found_obj.html) {
			var buttons = getElementsByTagAndClassName('input','regButton',
			    found_obj.html);
			var fields = getElementsByTagAndClassName('input','timecode',
			    found_obj.html);
			
			var components = {
			    'startButton':buttons[0],
			    'startField':fields[0],
			    'endButton':buttons[1],
			    'endField':fields[1]
			};
		    }
		    return components;
		};
	    },
	    ///Controller
	    ///
	    controller:function _default_Controller() {
		this.updateStart = function() {
		    if (self.media) {
			if (self.media.pause) self.media.pause();
			var time = self.media.time();
			var timecode = self.secondsToCode(time,true);
			self.components.startField.value = timecode;
			
			var endtime = self.codeToSeconds(self.components.endField.value);
			if (time > endtime) {
			    self.components.endField.value = timecode;
			}
			
		    }
		}
		this.updateEnd = function() {
		    if (self.media) {
			if (self.media.pause) self.media.pause();
			var time = self.media.time();
			var timecode = self.secondsToCode(time,true);
			self.components.endField.value = timecode;
			
			var starttime = self.codeToSeconds(self.components.startField.value);
			if (time < starttime) {
			    self.components.startField.value = timecode;
			}
			
		    }
		}
		this.initialize = function() {
		    var s_btn = self.events.connect(self.components.startButton,'click',self,
			self.controller.updateStart);
		    var e_btn = self.events.connect(self.components.endButton,'click',self,
			self.controller.updateEnd);
		    self.addListener(s_btn,'startButton');
		    self.addListener(e_btn,'endButton');
		};
		this.disable = function() {
		    self.removeListener('startButton');
		    self.removeListener('endButton');
		};
	    }
	
	
	}

	///INIT with Defaults
	this.attachMicroformat(new this.defaults.FormFragment.microformat());
	this.controller = new this.defaults.FormFragment.controller();
    }
}