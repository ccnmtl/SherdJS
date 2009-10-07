//requires MochiKit
if (typeof vital == 'undefined') {
    vital = {};
}

function VitalSherdConfig() {
    //setup storage
    //find (assets and annotations) and load them into storage

    //seize openlinks

    //create htmlview (initially supporting quicktime, only)
    // with layers: clipstrip
    //close -> destroy view

    //foreachlayer update/load(ann)
}

function Vital_VideoViewer_Config() {
    /// view's listener view.focus(ann)
    /// view controller = LoadOnFocus()
    vital.notelist = new Vital_VideoViewer_NoteList(); //storage
    vital.assetview = new Sherd.Video.QuickTime();
    vital.noteform = new Vital_VideoViewer_NoteForm();//see below
    vital.clipstrip = new ClipStrip();

    //vital.clipstrip.attachView(vital.assetview);
    

    /*
    var interactor = new Sherd.Controllers.SynchronizeAll();

    interactor.attachAssetView(v_view);
    interactor.addAssetLayer(v_clipstrip);
    interactor.addAssetLayer(v_noteform);
    interactor.addModel(v_notelist);
    
    v_view.html.put($('videoclip'));
    v_clipstrip.html.put($('clipstrip'));
    v_noteform.html.put($('videonoteform'));
*/
}

function Vital_VideoViewer_NoteForm() {
    var self = this;
    Sherd.Base.DomObject.apply(this,arguments); //inherit
    Sherd.Video.Helpers.apply(this);
    ///Microformat
    ///
    function _default_Microformat() {
	this.type = function() {return 'feature'};
	this.read = function(found_obj) {
	    var comp=self.microformat.components(found_obj);
	    return {'start':self.codeToSeconds(comp.startField),
		    'startCode':comp.startField,
		    'end':self.codeToSeconds(comp.endField),
		    'endCode':self.codeToSeconds(comp.endField)
		   };
	};
	this.update = function(obj,found_obj) {
	    var comp=self.microformat.components(found_obj);
	    if (obj.startCode)
		comp.startField.value = obj.startCode;
	    if (obj.endCode)
		comp.endField.value = obj.endCode;
	};
	this.components = function(found_obj) {
	    if (!self.components) {
		if (found_obj.html) {
		    var buttons = getElementsByTagAndClassName('input','regButton',
							       found_obj.html);
		    var fields = getElementsByTagAndClassName('input','timecode',
							      found_obj.html);
		    
		    self.components = {'startButton':buttons[0],
				       'startField':fields[0],
				       'endButton':buttons[1],
				       'endField':fields[1]};
		}
	    }
	    return self.components;
	};
    }
    this.attachMicroformat(new _default_Microformat());

    ///Controller
    ///
    function _default_Controller() {
	this.updateStart = function() {
	    if (self.media) {
		if (self.media.pause) self.media.pause();
		var time = self.media.time();
		var timecode = self.secondsToCode(time);
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
		var timecode = self.secondsToCode(time);
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
function Vital_VideoViewer_NoteList() {
    //storage is really whatever's in the form
    Sherd.Base.Storage.apply(this,arguments); //inherit
    var self = this;
    this.stuff  ={};
    this.data = {
	get:function(objId) {
	    if (objId in self.stuff) {
		return self.stuff[objId];
	    }
	},
	put:function(objId,obj) {
	    if (typeof self.stuff[objId] == 'undefined') {
		self.stuff[objId] = {};
	    }
	    for (a in obj) {//shallow update
		if (a!='metadata')
		    self.stuff[objId][a] = obj[a];
		else {
		    for (m in self.stuff[objId][a]) {
			self.stuff[objId][a][m] = obj[a][m];
		    }
		}
	    }
	}
    }
    this.save = function(ann,layer) {
	//TODO: update form with ann details

	//BAD:ignores ann, for whatever's in the form
	verifyIntegrity("videonoteform");
    };
    this.remove = function(ann,layer) {
	//do nothing
    };
    this.select = function(annId,layer) {
	var have_it = this.data.get(annId);
	if (have_it) {
	    this.events.signal('select',annId);
	}
    }
    this.update = function(obj) {
	if (obj.id) {
	    this.data.put(obj.id,obj);
	    this.events.signal('update',obj.id,obj);
	}
    }
}


function Vital_EssayWorkspace_Note_Microformat() {
    var self = this;
    this.type = function(){return 'annotation';};
    this.find = function(html_dom) {
	return map(function(dom) {return {html:dom};},
		   getElementsByTagAndClassName('div','noteclip',html_dom)
		  );
    };
    this.components = function(html_dom) {
	var components = {'top':html_dom
			  ,'hideshow':null
			  ,'openlink':null
			  ,'videosource':null
			  ,'materialCitation':getFirstElementByTagAndClassName('img','materialCitation',found_obj.html)
			 };
	var atags = getElementsByTagAndClassName('a',null,found_obj.html);
	forEach(atags,function(atag) {
	    if (/javascript:openPopWin/.test(atag.href)) {
		components.openlink = atag;
	    } else if (/ex_/.test(atag.className)) {
		components.hideshow = atag;
	    } else if (/videosource/.test(atag.className)) {
		components.videosource = atag;
	    }
	});
	return components;
    };
    this.read = function(found_obj) {
	var rv = {'type':'annotation'
		  ,'metadata':{'tags':[]}
		  ,'annotations':[]
		  ,'asset':{}
		 };
	var c = self.components(found_obj.html);
	var annlink = String(c.openlink.href).match(/id=(\d+).*annotationId=(\d+)/);
	rv['id'] = annlink[2];
	rv['asset']['id'] = annlink[1];
	rv['asset']['url'] = c.videosource.href;

	rv['metadata']['title'] = c.openlink.innerHTML;
	var start_end = c.materialCitation.getAttribute('title').match(/([:\d]+)-([:\d]+)$/);
	//just text--not Int #seconds
	rv['annotations'].push({'start':start_end[1],'end':start_end[2]});
	
	rv['metadata']['body'] = getFirstElementByTagAndClassName('td','nc_content',found_obj.html).getElementsByTagName('div').innerHTML;
	//TODO: tags, modified

	return rv;
    };
    this.write = function(obj,doc) {

    };
}


