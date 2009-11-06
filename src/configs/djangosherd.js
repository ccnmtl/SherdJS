//requires MochiKit
if (typeof djangosherd=='undefined'){djangosherd = {};}

djangosherd.initAssets = function() {
    forEach(getElementsByTagAndClassName('div','asset-links'),
	    function(asset_links) {
		var obj_div = getFirstElementByTagAndClassName('div','asset-display',asset_links.parentNode);

		var asset = djangosherd.assetview.html.pull(asset_links, 
		                                            djangosherd.assetMicroFormat);
		djangosherd.assetview.html.push(obj_div,{asset:asset});
	    });
}

function DjangoSherd_Asset_Config() {
    ///: currently (obv) assumes one asset
    ///: editable derives from user.is_authenticated (true for all), and any particular annotation

    ///# Find assets. initAssets()
    ///# Editable? (i.e. note-form?)
    ///#   What type of asset is it? ***
    ///#   load asset into note-form
    ///#   load asset for play
    ///# else:
    ///#   look for asset in hash
    ///#     load asset for play
    ///# Setup Noteform (for annotating asset)
    ///#   video: on field change, 
    ///#     update code; (connect AND InMovieTime wrappers)
    ///#     update view

    ///: More meta (what should stay here)
    ///# init sources with their format-understanders (and config on when to update or with a rescan-hook?)
    ///# init controller for presentation (one at a time, right?) ?with starting destination
    ///# new information?  who cares? (sources and listeners: observer pattern sounds like enough)

    var ds = djangosherd;
    ds.assetMicroFormat = new DjangoSherd_AssetMicroFormat();
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();

    //ds.notelist = new DjangoSherd_NoteList(); //storage
    ds.assetview = new Sherd.Video.QuickTime();//TODO: youtube|qt
    ds.assetview.id = function(){return 'movie1';}//hackity-hack

    ds.noteform = new DjangoSherd_NoteForm();//see below
    //djangosherd.clipstrip = new ClipStrip();

    ds.clipform = new DjangoSherd_ClipForm();//see vitalwrapper.js
    ds.clipform.attachView(ds.assetview);//to query current state.
    ds.clipform.addStorage(ds.noteform);//will get updated when clipform does

    addLoadEvent(function() {
	ds.initAssets();
	//ds.clipstrip.html.put($('clipstrip'));
	ds.noteform.html.put($('clip-form'));

	ds.clipform.html.push('videonoteform',{asset:{} }); //write videoform
	ds.clipform.initialize(); //build listeners

	var orig_annotation_data = $('original-annotation');
	if (orig_annotation_data != null) {
	    var obj = false;
	    try {
		obj = evalJSON(orig_annotation_data.getAttribute('data-annotation'));
	    }catch(e){/*non-valid json?*/}
	    if (ds.clipform.setState(obj)) {//true on success
		ds.assetview.setState(obj);
	    }
	} else {
	    var annotation_query = ds.clipform.queryformat.find(document.location.hash);
	    if (annotation_query.length) {
		ds.assetview.setState(annotation_query[0]);
	    }
	}
	////Clicking EditClip tab starts to clipping
	var clip_tab = ($('Clip'))?$('Clip'):$('EditClip');
	connect(clip_tab,'onclick',function(evt){
	    var view_state = ds.assetview.getState();
	    //state unmanipulated
	    if (view_state['default']) {
		if (typeof ds.assetview.play=='function') {
		    ds.assetview.play();
		}
	    } 
	    //state already manipulated, so bring it in.
	    //TODO: probably not setState here--instead send it to something like .annotate() which'll call getState()
	    else if (ds.clipform.getState()['default']) {
		ds.clipform.storage.update(view_state);
	    }
	});
    });
}
function DjangoSherd_Project_Config(no_open_from_hash) {
    ///# load viewers
    ///# load assetfinders
    ///# if (no_open_from_hash and hash)
    ///#   openCitation(annotation)
    var ds = djangosherd;
    ds.assetview = new Sherd.Video.QuickTime();//TODO: youtube|qt
    ds.assetview.id = function(){return 'movie1';}
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();
    //djangosherd.clipstrip = new ClipStrip();
    if (!no_open_from_hash) {
	var annotation_to_open = String(document.location.hash).match(/annotation=annotation(\d+)/);
	if ( annotation_to_open != null) {
	    addLoadEvent(function() {
		openCitation(annotation_to_open[1]+'/',true);
	    });
	}
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
}

/**********************
 'temp' VITAL adaption (instead of using sherd
**********************/

//carryover from vital--should return whether we're editing a clip or not
//used for clipstrip setting (see initClipStrip() )
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
    ///# where is my destination?
    ///# is there an annotation/asset already there?
    ///#     if same: leave alone
    ///#     else: 
    ///#       unload oldasset, 
    ///#       load asset
    ///# else: load asset
    ///# is annotation not-present?
    ///#    load annotation (with options (e.g. autoplay)
    ///# update local views
    ///#    e.g. location.hash
    var id = url.match(/(\d+)\/$/).pop();

    if (current_citation) removeElementClass(current_citation,'active-annotation');
    current_citation = getFirstElementByTagAndClassName(null,'annotation'+id);
    addElementClass(current_citation,'active-annotation');
    showElement('videoclipbox');

    var ann_obj = djangosherd.annotationMicroformat.read({html:current_citation});
    var obj_div = getFirstElementByTagAndClassName('div','asset-display' /*TODO:parent!*/);


    if (ann_obj.asset) {
	ann_obj.asset.autoplay = (no_autoplay)?'false':'true'; //***

	djangosherd.assetview.html.push(obj_div,{asset:ann_obj.asset});
	/*
	var asset_html = djangosherd.assetview.microformat.create(ann_obj.asset);

	///CHOPPING BLOCK: push to quicktime view
	var try_update = djangosherd.assetview.microformat.update(ann_obj.asset,
   	    document.movie1);//BIG BAD ASSUMPTION of single viewer //***
	if (!try_update) {///HACK HACK HACK
	    obj_div.innerHTML = asset_html.text;
	    if (/Trident/.test(navigator.userAgent)) {
		///again!  just for IE.  nice IE, gentle IE
		setTimeout(function() {
		    //AGAIN: BIG BAD ASSUMPTION of single viewer
		    djangosherd.assetview.microformat.update(ann_obj.asset,
   							     document.movie1);
		},100);
	    }
	}
        */
	var ann_data = ann_obj.annotations[0];
	djangosherd.assetview.setState(ann_data);
    } else {
	djangosherd.assetview.html.remove();
    }
    document.location = '#annotation=annotation'+id;
}
