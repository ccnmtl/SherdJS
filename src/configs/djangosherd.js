//requires MochiKit
if (typeof djangosherd=='undefined'){djangosherd = {};}

///assetview: html.pull,html.push,html.remove,setState,getState,&OPTIONAL:play 
/// pull,push are supported by Base.AssetView, but in, turn, call:
///  id, microformat.update, microformat.write, microformat.create
/// when attached to clipform: media.duration,media.movscale (and probably media.time)

djangosherd.findAssets = function() {
    var assets = [];
    forEach(getElementsByTagAndClassName('div','asset-links'),
	    function(asset_links) {
		assets.push( djangosherd.assetMicroFormat.read({html:asset_links}) );
	    });
    return assets;
}

function GenericAssetView(options) {
    var self = this;

    ////INIT
    this.settings = {};
    if (Sherd.Video && Sherd.Video.QuickTime) {
	var quicktime = {'view':new Sherd.Video.QuickTime()};
	quicktime.view.id = function(){return 'movie1';}//hackity-hack
	if (options.clipform) {
	    quicktime.clipform = new DjangoSherd_ClipForm();//see vitalwrapper.js
	    quicktime.clipform.attachView(quicktime.view);
	    if (options.storage) {
		quicktime.clipform.addStorage(options.storage);
	    }
	}
	this.settings.quicktime = quicktime;
    }
    if (Sherd.Image && Sherd.Image.OpenLayers) {
	var image = {'view':new Sherd.Image.OpenLayers()};
	if (options.clipform) {
	    image.clipform = new Sherd.Image.Annotators.OpenLayers();
	    image.clipform.attachView(image.view);
	    if (options.storage) {
		image.clipform.addStorage(options.storage);
	    }
	}
	this.settings.image = image;
    }
    ////API
    var current_type = false;
    this.html = {
	remove:function() {
	    if (current_type) {
		self.settings[current_type].view.html.remove();
	    }
	},
	push:function(html_dom,options) {
	    if (options.asset 
		&& options.asset.type
		&& (options.asset.type in self.settings)
	       ) {
		if (current_type && current_type != options.asset.type) {
		    self.settings[current_type].view.html.remove();
		}
		current_type = options.asset.type;
		///the main pass
		self.settings[current_type].view.html.push(html_dom,options);

		if (self.settings[current_type].clipform) {
		    self.clipform = self.settings[current_type].clipform;
		}
	    } else {
		throw "Your asset does not have a (supported) type marked";
	    }
	}
    }
    this.setState = function() {
	if (current_type) {
	    self.settings[current_type].view.setState.apply(
		self.settings[current_type].view,
		arguments//special JS magic
	    );
	}
    }
}

function DjangoSherd_Asset_Config() {
    ///: currently (obv) assumes one asset
    ///: editable derives from user.is_authenticated (true for all), and any particular annotation

    ///: Meta (what should stay here)
    ///# init sources with their format-understanders (and config on when to update or with a rescan-hook?)
    ///# init controller for presentation (one at a time, right?) ?with starting destination
    ///# new information?  who cares? (sources and listeners: observer pattern sounds like enough)

    var ds = djangosherd;
    ds.assetMicroFormat = new DjangoSherd_AssetMicroFormat();
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();

    ds.noteform = new DjangoSherd_NoteForm();//see below
    //djangosherd.clipstrip = new ClipStrip();

    addLoadEvent(function() {
	///# Find assets.
	var assets = ds.findAssets();
	if (!assets.length) return;//no assets!

	ds.assetview = new GenericAssetView({'clipform':true,'storage':ds.noteform});

	//ds.clipstrip.html.put($('clipstrip'));
	var obj_div = getFirstElementByTagAndClassName('div','asset-display');//id=videoclip
	ds.assetview.html.push(obj_div,{asset: assets[0] });

	///# Editable? (i.e. note-form?)
	ds.noteform.html.put($('clip-form'));
	///#   load asset into note-form
	ds.assetview.clipform.html.push('videonoteform',{asset:{} }); //write videoform
	ds.assetview.clipform.initialize(); //build listeners

	var orig_annotation_data = $('original-annotation');
	if (orig_annotation_data != null) {
	    var obj = false;
	    try {
		///#initialize for editing
		obj = evalJSON(orig_annotation_data.getAttribute('data-annotation'));
		///let assetview go first, because it might be able to give the
		///obj hints for the clipform which should be stupider
		ds.assetview.setState(obj);
		ds.assetview.clipform.setState(obj);
	    }catch(e){/*non-valid json?*/}
	} else {
	    var annotation_query = [];
	    if (document.location.hash) {
		///?why should queryformat be on clipform?  maybe local default?
		annotation_query = ds.assetview.clipform.queryformat.find(document.location.hash);
	    }
	    if (annotation_query.length) {
		///#initialize view from hash
		ds.assetview.setState(annotation_query[0]);
	    } else {
		///#default initialization
		ds.assetview.setState();
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
	    else if (ds.assetview.clipform.getState()['default']) {
		//TODO: probably should let clipform decide whether to do this
		ds.assetview.clipform.storage.update(view_state);
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
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();
    ds.assetview = new GenericAssetView({/*no clipform*/});

    if (!no_open_from_hash) {
	var annotation_to_open = String(document.location.hash).match(/annotation=annotation(\d+)/);
	if ( annotation_to_open != null) {
	    addLoadEvent(function() {
		    openCitation(annotation_to_open[1]+'/',true);
	    });
	}
    }
    addLoadEvent(function(){
	forEach($$('a.materialCitation'),function(elt){
	    var url = elt.getAttribute('href');
	    connect(elt,'onclick',function(evt){
		openCitation(url);
		evt.preventDefault();//don't open href
	    });
	});
    });
}

function DjangoSherd_AssetMicroFormat() {
    this.read = function(found_obj) {
	var rv = {};
	forEach(getElementsByTagAndClassName('a','assetsource',found_obj.html),function(elt) {
	    var reg = String(elt.className).match(/assetlabel-(\w+)/);
	    if (reg != null) {
		///ASSUMES: only one source for each label
		///use getAttribute rather than href, to avoid urlencodings
		rv[ reg[1] ] = elt.getAttribute('href');
		///TODO: maybe look for some data attributes here, too, when we put them there.
	    }
	});
	if (rv.quicktime) {
	    var poster = getFirstElementByTagAndClassName('img','assetimage-poster',found_obj.html);
	    //TODO: dereference poster url
	    //test on poster.width is to make sure it is loaded/loadable
	    /// e.g. if poster.src gives a 500 error, then Quicktime will super-barf
	    ///      and the video becomes comletely inaccessible
	    rv.poster = ((poster && poster.width) ? poster.src : '/site_media/js/sherdjs/media/images/click_to_play.jpg');
	    return update(rv,{type:'quicktime',
			      url:rv.quicktime,
			      height:256,
			      width:320,
			      autoplay:'false',
			      loadingposter:'/site_media/js/sherdjs/media/images/poster.gif'
			     }
			 );
	} else if (rv.youtube) {
	    return {type:'youtube',
		    url:rv.youtube,
		    height:240,
		    width:320
		   };
	} else if (rv.image) {
	    rv.type = 'image';
	    return rv;
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
    Sherd.Base.DomObject.apply(this,arguments);//inherit
    this.storage = {
	update:function(obj) {
	    var range1 = '0';
	    var range2 = '0';
	    if (obj.start) {//video
		range1 = obj.start;
		range2 = obj.end;
	    } else if (obj.x) {//image
		range1 = obj.x;
		range2 = obj.y;
	    }
	    //top is the form
	    self.components.top['annotation-range1'].value = range1;
	    self.components.top['annotation-range2'].value = range2;
	    self.components.top['annotation-annotation_data'].value = serializeJSON(obj);//TODO obj!
	}
    }
    //TODO: less barebones
    //1. send signal for updates when replaced
}

/**********************
 'temp' VITAL adaption (instead of using sherd
**********************/

//carryover from vital--should return whether a clip should be visible
//used for clipstrip setting (see initClipStrip() )
function currentUID() {
    return true;
    //just returning true, will show the markers at 0, but hey, so what
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

	var ann_data = ann_obj.annotations[0];
	djangosherd.assetview.setState(ann_data);
    } else {
	djangosherd.assetview.html.remove();
    }
    document.location = '#annotation=annotation'+id;
}



/****random thoughts
what is in the user's control context (C)?
0. asset representations
   - announce they want focus (but need instantiation)
   -- arguments are asset, and representations object
   --in place?  the presenter decides
1. an asset presenter (in focus) (V)
   - some assets can announce that they've gained focus
     - e.g. when someone clicks play or starts panning/zooming, etc.
2. an annotator (decorated on the presenter?) (C)
   - (edit/create mode): has state about how the user is entering info
   - connected (deeply) to the asset-type
3. annotation representations (V):
   - has a storage/collection source 
   -signals selection,editing TO controller
   -receives signal to update (from storage), possibly with args (to narrow what should be updated)
(only for creating/editing mode)
3. a collection (i.e. storage) of annotations (M)
   - for default 'save' target

STORIES:
  when an asset changes in the presenter
    (?what happens to the representations, etc)
    (?annotators)
  when a representation wants focus of an asset that's not in view
   -or two assets at once?
   --maybe one 'annotation representation' is two presenters within it?
   --what would this do to 'focus' wrt replacement? 
      (just because focus went somewhere doesn't mean it should be the destination of other asset loads)
*/