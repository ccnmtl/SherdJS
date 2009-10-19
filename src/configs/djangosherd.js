//requires MochiKit
if (typeof djangosherd=='undefined'){djangosherd = {};}

djangosherd.initAssets = function() {
    forEach(getElementsByTagAndClassName('div','asset-links'),
	    function(asset_links) {
		///1. read asset_obj
		///2. insert asset_obj into obj_div as assetview
		var obj_div = getFirstElementByTagAndClassName('div','asset-display',asset_links.parentNode);

		djangosherd.assetview.html.pull(asset_links, 
						djangosherd.assetMicroFormat);
		djangosherd.assetview.html.push(obj_div);
		/*
		var asset_obj = djangosherd.assetMicroFormat.read({html:asset_links});

		djangosherd.assetview.html.put(obj_div, asset_obj);

		//TODO: fix along with better API
		var asset = djangosherd.assetview.microformat.create(asset_obj);
		obj_div.innerHTML = asset.text;
		djangosherd.assetview.html.put(document.getElementById(asset.htmlID));
               */
	    });
}

function DjangoSherd_Asset_Config() {
    var ds = djangosherd;
    ds.assetMicroFormat = new DjangoSherd_AssetMicroFormat();
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();

    ds.notelist = new DjangoSherd_NoteList(); //storage
    ds.assetview = new Sherd.Video.QuickTime();//TODO: youtube|qt
    ds.assetview.id = function(){return 'movie1';}
    //ds.clipform = new DjangoSherd_ClipForm();//see below
    ds.noteform = new DjangoSherd_NoteForm();//see below
    //djangosherd.clipstrip = new ClipStrip();

    //ds.clipform.attachView(ds.assetview);
    //ds.clipform.addStorage(ds.noteform);
    function DjangoSherd_UpdateHack() {
	var obj = {
	    startCode:document.forms['videonoteform'].clipBegin.value,
	    endCode:document.forms['videonoteform'].clipEnd.value,
	    duration:theMovie.GetDuration(),
	    timeScale:movscale
	};
	obj.start = ds.assetview.codeToSeconds(obj.startCode);
	obj.end = ds.assetview.codeToSeconds(obj.endCode);
	ds.noteform.storage.update(obj);
    }
    addLoadEvent(function() {
	ds.initAssets();
	//ds.clipstrip.html.put($('clipstrip'));
	ds.noteform.html.put($('clip-form'));
	//ds.clipform.html.put($('clipping-form'));
	var orig_annotation_data = $('original-annotation');
	if (orig_annotation_data != null) {
	    try {
		var obj = evalJSON($('original-annotation').getAttribute('data-annotation'));
		if (typeof obj=='object' && obj.startCode) {
		    document.forms['videonoteform'].clipBegin.value=obj.startCode;
		    document.forms['videonoteform'].clipEnd.value=obj.endCode;
		    if (obj.duration) movDuration = obj.duration;
		    if (obj.timeScale) movscale = obj.timeScale;
		    formToClip();
		    refresh_mymovie(obj.startCode,obj.endCode,'Clip');
		}
	    } catch(e) {/*eh, nevermind*/}
	} else {
	    var start_point = String(document.location.hash).match(/start=(\d+)/);
	    if ( start_point != null) {
		var start = ds.assetview.secondsToCode(start_point[1]);
		giveUp();
		refresh_mymovie(start, start, 'Clip');
		prepareGrabber();
	    }

	}

	connect(document.forms['videonoteform'].clipBegin,'onchange',function() {
	    var obj = {};
	    obj.start = ds.assetview.codeToSeconds(obj.startCode);
	    obj.end = ds.assetview.codeToSeconds(obj.endCode);
	    if (obj.end < obj.start) 
		document.forms['videonoteform'].clipEnd.value = document.forms['videonoteform'].clipBegin.value;
	    DjangoSherd_UpdateHack();
	});
	connect(document.forms['videonoteform'].clipEnd,'onchange',function() {
	    var obj = {};
	    obj.start = ds.assetview.codeToSeconds(obj.startCode);
	    obj.end = ds.assetview.codeToSeconds(obj.endCode);
	    if (obj.end < obj.start) 
		document.forms['videonoteform'].clipStart.value = document.forms['videonoteform'].clipEnd.value;
	    DjangoSherd_UpdateHack();
	});
	////Connect tabs to VITAL functions
	var clip_tab = ($('Clip'))?$('Clip'):$('EditClip');
	connect(clip_tab,'onclick',function(evt){
	    //if  t>0 and current value is zero(d), then set (and pause)
	    
	    if ($('currtime').innerHTML=='00:00:00') {
		var mimetype = theMovie.GetMIMEType();
		if (/image/.test(mimetype)) {
		    theMovie.SetURL(theMovie.GetHREF());
		} else {
		    theMovie.Play();
		}
	    } else if (document.forms['videonoteform'].clipBegin.value == '00:00:00') {
		InMovieTime();
	    }
	    initClipStrip();
	});
	connect('Item','onclick',initClipStrip);
    });
    //DECORATORS
    var old_InMovieTime = InMovieTime;
    var old_OutMovieTime = OutMovieTime;
    InMovieTime = function() {
	old_InMovieTime.apply(window,arguments);
	DjangoSherd_UpdateHack();
    }
    OutMovieTime = function() {
	old_OutMovieTime.apply(window,arguments);
	DjangoSherd_UpdateHack();
    }

}
function DjangoSherd_Project_Config() {
    var ds = djangosherd;
    ds.assetview = new Sherd.Video.QuickTime();//TODO: youtube|qt
    ds.assetview.id = function(){return 'movie1';}
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();
    //ds.clipform = new DjangoSherd_ClipForm();//see below
    //djangosherd.clipstrip = new ClipStrip();
    var annotation_to_open = String(document.location.hash).match(/annotation=annotation(\d+)/);
    if ( annotation_to_open != null) {
	addLoadEvent(function() {
	    openCitation(annotation_to_open[1]+'/',true);
	});
    }
}

function DjangoSherd_AssetMicroFormat() {
    this.read = function(found_obj) {
	var rv = {};
	var link = getFirstElementByTagAndClassName('a','assetlabel-quicktime',found_obj.html);
	if (link) { 
	    var poster = getFirstElementByTagAndClassName('img','assetimage-poster',found_obj.html);
	    //TODO: dereference poster url
	    //test on poster.width is to make sure it is loaded/loadable
	    /// e.g. if poster.src gives a 500 error, then Quicktime will super-barf
	    ///      and the video becomes comletely inaccessible
	    rv.poster = ((poster && poster.width) ? poster.src : '/site_media/js/sherdjs/media/images/poster.gif');
	    return update(rv,{type:'quicktime'
			      ,url:link.href
			      ,quicktime:link.href
			      ,height:256
			      ,width:320
			      ,autoplay:'false'
			     }
			 );
	}
	link = getFirstElementByTagAndClassName('a','assetlabel-youtube',found_obj.html);
	if (link) { return {type:'youtube'
			    ,url:link.href
			    ,youtube:link.href
			    ,height:240
			    ,width:320
			   };
		  }
	
    }
}

function DjangoSherd_AnnotationMicroFormat() {
    var asset_mf = new DjangoSherd_AssetMicroFormat();
    var video = new Sherd.Video.Helpers();
    this.read = function(found_obj) {
	var rv = {
	    metadata:{},
	    view:{},
	    annotations:[]
	};
	var asset_elt = getFirstElementByTagAndClassName('div','asset-links',found_obj.html);
	if (asset_elt) 
	    rv.asset = asset_mf.read({html:asset_elt});
	var data_elt = getFirstElementByTagAndClassName('div','annotation-data',found_obj.html);
	var ann_title = getFirstElementByTagAndClassName('div','annotation-title',found_obj.html);
	if (ann_title)
	    rv.metadata['title'] = ann_title.innerHTML;
	var ann_data = evalJSON(data_elt.getAttribute('data-annotation'));
	//var ann_data = evalJSON(data_elt.innerHTML);
	ann_data.start = parseInt(data_elt.getAttribute('data-begin'),10);
	ann_data.end = parseInt(data_elt.getAttribute('data-end'),10);
	ann_data.startCode = video.secondsToCode(ann_data.start);
	ann_data.endCode = video.secondsToCode(ann_data.end);
	rv.annotations.push(ann_data);
	return rv;
    }

}
function DjangoSherd_NoteList() {
}

function DjangoSherd_ClipForm() {
    var self = this;
    Sherd.Video.Annotators.FormFragment.apply(this,arguments);//inherit

    //TODO: when create-clip is tabbed to, we also need to gettime/pause
}



function DjangoSherd_NoteForm() {
    var self = this;
    this.html = {
	put:function(dom) {
	    self.components = {'form':dom};
	}
    };
    this.storage = {
	update:function(obj) {
	    self.components.form['annotation-range1'].value = obj.start;
	    self.components.form['annotation-range2'].value = obj.end;
	    self.components.form['annotation-annotation_data'].value = serializeJSON(obj);//TODO obj!
	}
    }
    //TODO: less barebones
    //1. send signal for updates when replaced
    //2. ClipForm needs to listen (via Storage)
}

/**********************
 'temp' VITAL adaption (instead of using sherd
**********************/

//carryover from vital--should return whether we're editing a clip or not
function currentUID() {
    try {
	var clip_tab = ($('Clip'))?$('Clip'):$('EditClip');
	return clip_tab.parentNode.className == 'tabberactive';
    } catch(e) {//no clip element
	return true;
    }
}

var current_citation = false;
function openCitation(url,no_autoplay) {
    var id = url.match(/(\d+)\/$/).pop();

    if (current_citation) removeElementClass(current_citation,'active-annotation');
    current_citation = getFirstElementByTagAndClassName(null,'annotation'+id);
    addElementClass(current_citation,'active-annotation');
    showElement('videoclipbox');

    var ann_obj = djangosherd.annotationMicroformat.read({html:current_citation});
    var obj_div = getFirstElementByTagAndClassName('div','asset-display' /*TODO:parent!*/);

    ann_obj.asset.autoplay = (no_autoplay)?'false':'true';

    var asset = djangosherd.assetview.microformat.create(ann_obj.asset);

    var try_update = djangosherd.assetview.microformat.update(ann_obj.asset,
   	document.movie1);//BIG BAD ASSUMPTION of single viewer
    if (!try_update) {///HACK HACK HACK
	obj_div.innerHTML = asset.text;
    }
    djangosherd.assetview.html.put(document.getElementById(asset.htmlID));
    var ann_data = ann_obj.annotations[0];
    //VITAL code
    if (ann_data.duration) movDuration = ann_data.duration;
    if (ann_data.timeScale) movscale = ann_data.timeScale;
    giveUp();
    prepareGrabber();
    refresh_mymovie(ann_data.startCode,ann_data.endCode,'Clip');
    document.location = '#annotation=annotation'+id;
}
