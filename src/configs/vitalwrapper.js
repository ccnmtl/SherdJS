///interfaces:
///InMovieTime();
///OutMovieTime();

///videonoteform
///1. update noteform field: DjangoSherd_UpdateHack()
///2. initialize videonoteform field vals
///3. onchange of text fields in videonoteform to run: DjangoSherd_UpdateHack
///4. on tab-change, set startTime (and from that run DjangoSherd_UpdateHack)

///5. (also switch InMovieTime(),OutMovieTime() to listeners)

function DjangoSherd_ClipForm() {
    var self = this;
    //Sherd.Video.Annotators.FormFragment.apply(this,arguments);//inherit
    Sherd.Base.AssetView.apply(this,arguments);//inherit

    //TODO: when create-clip is tabbed to, we also need to gettime/pause
    this._asset = {};//to be 'true'
    this.targetstorage = [];
    this.html.put = function(dom) {
	var inputs = dom.getElementsByTagName('input');
	self.components = {
	    'form': dom,
	    'startButton':inputs[2],
	    'endButton':inputs[4],
	    'startField':inputs[3],
	    'endField':inputs[5]
	}
    }

    ///will this work?  this is all so hacky!
    this.attachView = function(view) {
	//this.media = view.media; //WTF?!
	this.targetview = view;
    }
    this.addStorage = function(stor) {
	this.targetstorage.push(stor);
    }

    this.getState = function() {
	var duration = self.targetview.media.duration();
	var timeScale = self.targetview.media.movscale;
	var obj = {
	    startCode:self.components.startField.value,
	    endCode:self.components.endField.value,
	    duration:duration,
	    timeScale:timeScale
	};
	obj.start = self.targetview.codeToSeconds(obj.startCode);
	obj.end = self.targetview.codeToSeconds(obj.endCode);
	return obj;
    }

    this.storage = {
	update: function(obj) {
	    for (var i=0;i<self.targetstorage.length;i++) {
		self.targetstorage[i].storage.update(obj);
	    }
	}
    }

    this.initialize = function() {
	//MochiKit!!!
	connect(self.components.startButton,'onclick',function(evt) {
	    InMovieTime(); //embedded assumption of forms['videonoteform']
	    var obj = self.getState();
	    self.storage.update(obj);
	});
	connect(self.components.endButton,'onclick',function(evt) {
	    OutMovieTime(); //embedded assumption of forms['videonoteform']
	    var obj = self.getState();
	    self.storage.update(obj);

	});
	connect(self.components.startField,'onchange',function(evt) {
	    var obj = self.getState();
	    if (obj.end < obj.start) {
		obj.end = obj.start;
		obj.endCode = obj.startCode;
		self.components.endField.value = obj.startCode;//HTML
	    }
	    self.storage.update(obj);
	});
	connect(self.components.endField,'onchange',function(evt) {
	    var obj = self.getState();
	    if (obj.end < obj.start) {
		obj.start = obj.end;
		obj.startCode = obj.endCode;
		self.components.startField.value = obj.endCode;//HTML
	    }
	    self.storage.update(obj);
	});
	
    }

    //1. update form field
    this.microformat = {
	create:function(obj) {
	    var htmlID = 'vitalcrap1';
	    return {htmlID:htmlID,text:'<div id="'+htmlID+'"><div class="vitalcrap" style="display:none">\
	    <input type="radio" name="clipType" value="Clip" checked="checked" />\
	    <input type="radio" name="clipType" value="Marker"/>\
	  </div>\
	  <div id="clipcontrols"><!--stolen from vital-->\
	    <div class="cliptimeboxtable" style="width: 320px;">\
	      <table border="0" cellspacing="0" cellpadding="0">\
		<tr>\
		  <td style="padding: 2px;"><input type="button" onclick="InMovieTime()" class="regButton" style="width: 70px" value="start:" /></td>\
		  <td style="padding: 2px 10px 2px 2px; border-right: 1px dotted #999;">\
		    <input type="text" class="timecode" name="clipBegin" value="00:00:00" /></td><!-- Do not change the name "clipBegin" -->\
		    <td style="padding: 2px 2px 2px 7px;"><input type="button" onclick="OutMovieTime()" class="regButton" style="width: 70px" value="end:" /></td>\
		    <td style="padding: 2px;">\
		      <input type="text" class="timecode" name="clipEnd" value="00:00:00" /></td><!-- Do not change the name "clipEnd" -->\
		</tr>\
	      </table>\
	    </div>\
	  </div></div>'};
	}//create function
    }//microformat

}
