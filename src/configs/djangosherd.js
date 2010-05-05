//requires MochiKit
if (typeof djangosherd == 'undefined') {
    djangosherd = {};
}

// /assetview: html.pull,html.push,html.remove,setState,getState,&OPTIONAL:play
// / pull,push are supported by Base.AssetView, but in, turn, call:
// / id, microformat.update, microformat.write, microformat.create
// / when attached to clipform: media.duration,media.timescale (and probably
// media.time)

function DjangoSherd_Asset_Config() {
    var ds = djangosherd;
    ds.assetMicroFormat = new DjangoSherd_AssetMicroFormat();
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();
    ds.noteform = new DjangoSherd_NoteForm();// see below

    addLoadEvent(function() {
        // /# Find assets.
        ds.dom_assets = ds.assetMicroFormat.find();
        if (!ds.dom_assets.length)
            return;// no assets!
        
        // GenericAssetView is a wrapper in ../assets.js.
        ds.assetview = new Sherd.GenericAssetView( {
            'clipform' : true,
            'clipstrip' : true,
            'storage' : ds.noteform,
	    'targets':{clipstrip:'clipstrip-display'}
        });

        var obj_div = getFirstElementByTagAndClassName('div', 'asset-display');// id=videoclip
        ds.assetview.html.push(obj_div, {
            asset : ds.assetMicroFormat.read(ds.dom_assets[0])
        });

        // /# Editable? (i.e. note-form?)
        ds.noteform.html.put($('clip-form'));
        // /# load asset into note-form
        var clipform = $('clipform-display');
        if (clipform) {
            ds.assetview.clipform.html.push('clipform-display', {
                asset : {}
            }); // write videoform
        }

        var orig_annotation_data = $('original-annotation');// /***faux layer. Data stored in the DOM
        if (orig_annotation_data != null) {
            // Viewing an Annotation with stored data
            var obj = false;
            try {
                // /#initialize for editing
                obj = evalJSON(orig_annotation_data
                        .getAttribute('data-annotation'));
                ds.assetview.setState(obj);

                if (ds.assetview.clipform)
                    ds.assetview.clipform.setState(obj);

            } catch (e) {/* non-valid json? */
            }
        } else {
            // Viewing the Original Asset, possibly with params from queryString
            var annotation_query = [];
            if (document.location.hash) {
                annotation_query = ds.assetview.queryformat.find(document.location.hash);
            }
            if (annotation_query.length) {
                // /#initialize view from hash
                ds.assetview.setState(annotation_query[0]);
                
                if (ds.assetview.clipform)
                    ds.assetview.clipform.setState(annotation_query[0]);

            } else {
                // /#default initialization for an annotation
                // don't need to set state on clipstrip/form as there is no state
                ds.assetview.setState();
            }
        }
    });
}

function DjangoSherd_Project_Config(no_open_from_hash) {
    // /# load viewers
    // /# load assetfinders
    // /# if (no_open_from_hash and hash)
    // /# openCitation(annotation)
    var ds = djangosherd;
    ds.thumbs = [];
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();
    ds.storage = new DjangoSherd_Storage();
    // GenericAssetView is a wrapper in ../assets.js
    ds.assetview = new Sherd.GenericAssetView({ clipform:false, clipstrip: true});

    if (!no_open_from_hash) {
        var annotation_to_open = String(document.location.hash).match(
                /annotation=annotation(\d+)/);
        if (annotation_to_open != null) {
            addLoadEvent(function() {
                openCitation(annotation_to_open[1] + '/', {autoplay:false});
            });
        }
    }
    addLoadEvent(function() {
        // /TODO: unHACK HACK HACK
        // /need to make this more abstracted--where should we test for 'can
        // thumb'?
        var materials = $('materials'); // asset table list
        if (materials) {
            forEach(ds.annotationMicroformat.find(materials), function(
                    found_obj) {
                var ann_obj = ds.annotationMicroformat.read(found_obj);
                if (ann_obj.asset.thumbable) {// CAN THUMB?
                    var view;
                    switch(ann_obj.asset.type) {
                    case 'image':
                        view = new Sherd.Image.OpenLayers();
                        break;
                    case 'fsiviewer':
                        view = new Sherd.Image.FSIViewer();
                        break;
                    }
                    ds.thumbs.push(view);
                    var obj_div = DIV( {
                        'class' : 'thumb'
                    });
                    found_obj.html.parentNode.appendChild(obj_div);
                    // should probably be in .view
                    ann_obj.asset.presentation = 'thumb';
                    // .asset is the only thing used right now
                    view.html.push(obj_div, ann_obj);
                    view.setState(ann_obj.annotations[0]);
                }
            });
        }
        // /In published view: decorate annotation links
        
        DjangoSherd_decorate_citations($$('a.materialCitation'));
    });
}
function DjangoSherd_decorate_citations(elts) {
    forEach(elts, function(elt) {// MOCHI
        var url = elt.getAttribute('href');
        connect(elt, 'onclick', function(evt) {
            try {
                openCitation(url);
            }catch(e) {
                if (window.debug) {
                    logDebug('ERROR opening citation:'+e.message);
                    console.log(e);
                } else return;
            }
            evt.preventDefault();// don't open href
        });
    });
}

function DjangoSherd_Storage() {
    var self = this;
    var _current_citation = false;
    var _annotations = {};
    var _projects = {};
    this.initialize = function() {
        ///'json' is used to avoid cache-poisoning the html version of the page
        ///in GoogleChrome when we do Accept:application/json (so back button works)
        var def = MochiKit.Async.loadJSONDoc('json');
        def.addCallback(this.json_update)
    }
    
    this.get = function(subject, callback) {
        var id = subject.id;
        var ann_obj = null;
        var delay = false;
        if (id) {
            if (_current_citation) {
                removeElementClass(_current_citation, 'active-annotation');
            }
            _current_citation = getFirstElementByTagAndClassName('div',
                                                                'annotation' + id);
            if (_current_citation != null)
                addElementClass(_current_citation, 'active-annotation');
            
            if (id in _annotations) {
                ann_obj = _annotations[id];
            } else if (_current_citation != null) {
                ann_obj = djangosherd.annotationMicroformat.read( {
                    html : _current_citation
                });// /***faux layer
            } else {
                var def = MochiKit.Async.loadJSONDoc('/annotations/json/'+id+'/');
                def.addCallback(function(json) {
                    if (self.json_update(json)) {
                        callback(_annotations[id]);
                    }
                });
                delay = true;
            }
        }
        if (!delay && callback) {
            callback(ann_obj);
        }
    };
    this.json_update = function(json) {
        if (json.project) {
            _projects[json.project.id] = json.project;
        }
        for (asset_key in json.assets) {
            var a = json.assets[asset_key];
            for (j in a.sources) {
                a[j] = a.sources[j].url;
                
                if (a.sources[j].width) {
                    if (a.sources[j].primary) {
                        a.width = a.sources[j].width;
                        a.height = a.sources[j].height;
                    }
                    a[a.sources[j].label+'-metadata'] = {
                        'width':a.sources[j].width,
                        'height':a.sources[j].height
                    };
                }
            }
            DjangoSherd_adaptAsset(a); //in-place
        }
        for (var i=0;i<json.annotations.length;i++) {
            var ann = json.annotations[i];
            ann.asset = json.assets[ann.asset_key];
            ann.annotations = [ann.annotation];
            _annotations[ann.id] = ann;
            //console.log(ann);
        }
        return true;//success?
    }
    this.initialize();
}

// Object: DjangSherd_AssetMicroFormat
// Find and Return the assets listed in the page
// Assets are within a div called "asset-links"
// asset-primary -- the actual link to the media (image/video/etc.)
// assetlabel-X -- tells you what type the asset is. e.g. assetlabel-youtube is
// youtube, assetlabel-url is the "viewable" link to the media
function DjangoSherd_AssetMicroFormat() {
    this.find = function(dom) {
        dom = dom || document;
        var assets = getElementsByTagAndClassName('div', 'asset-links', dom);
        return map(function(e) {
            return {
                html : e
            }
        }, assets);
    };
    this.create = function(obj,doc) {
        var wrapperID = Sherd.Base.newID('djangoasset');
        ///TODO: make the creamy content filling
        return {
            object:obj,
            htmlID:wrapperID,
            text:'<div id="'+wrapperID+'" class="asset-links"></div>'
        };
    };
    this.read = function(found_obj) {
        var rv = {};
        forEach(
                getElementsByTagAndClassName('a', 'assetsource', found_obj.html),
                function(elt) {
                    var reg = String(elt.className).match(/assetlabel-(\w+)/);
                    if (reg != null) {
                        // /ASSUMES: only one source for each label
                        // /use getAttribute rather than href, to avoid
                        // urlencodings
                        /// unescape necessary for IE7 (and sometimes 8)
                        rv[reg[1]] = unescape(elt.getAttribute('href'));
                        // /TODO: maybe look for some data attributes here, too,
                        // when we put them there.
                        var metadata = elt.getAttribute('data-metadata');
                        if (metadata != null) {
                            var wh = metadata.match(/w(\d+)h(\d+)/);
                            rv[reg[1] + '-metadata'] = {
                                width : wh[1],
                                height : wh[2]
                            };
                            if (hasElementClass(elt, 'asset-primary')) {
                                rv['width'] = wh[1];
                                rv['height'] = wh[2];
                            }
                        }
                    }
                });

        return DjangoSherd_adaptAsset(rv);//in-place
    }
}

function DjangoSherd_adaptAsset(asset) {
    if (asset.quicktime) {
        asset.type = 'quicktime';
        if (asset.poster) {
            // TODO: dereference poster url
            // test on poster.width is to make sure it is loaded/loadable
            // / e.g. if poster.src gives a 500 error, then Quicktime will
            // / and the video becomes comletely inaccessible
            var poster = document.createElement('img');
            poster.src = asset.poster;
            if (!poster.width) {
                asset.poster = '/site_media/js/sherdjs/media/images/click_to_play.jpg';
            }
        }
        asset.url = asset.quicktime;  //TODO remove this and make sure quicktime.js uses .quicktime
        asset.loadingposter = '/site_media/js/sherdjs/media/images/poster.gif';
    } else if (asset.youtube) {
        asset.type = 'youtube';
    } else if (asset.flv || asset.flv_pseudo || asset.mp4 || asset.mp4_pseudo || asset.mp4_rtmp || asset.flv_rtmp) {
        asset.type = 'flowplayer';
    } else if (asset.image) {
        asset.type = 'image';
        asset.thumbable = true;
    } else if (asset.image_fpx && asset.fsiviewer) {
        asset.type = 'fsiviewer';        
        asset.thumbable = true;
    }
    return asset;
}
function DjangoSherd_AnnotationMicroFormat() {
    var asset_mf = new DjangoSherd_AssetMicroFormat();
    var video = new Sherd.Video.Helpers();
    this.find = function(dom) {
        dom = dom || document;
        var annotations = getElementsByTagAndClassName('div', 'annotation', dom);
        return map(function(e) {
            return {
                html : e
            }
        }, annotations);
    }
    this.create = function(obj,doc) {
        ///NOTE: currently only makes header, rather than a full serialization of the object
        var wrapperID = Sherd.Base.newID('djangoannotation');
        var return_text = '';
        if (obj.title) {
            return_text += '<div class="annotation-title"><h2>'+obj.title+'</h2></div>';
        }
        return_text += '<div class="asset-title">';
        if (obj.asset && obj.asset.title) {
            return_text += '<span class="asset-title-prefix">from </span><a href="'+obj.asset.local_url+'">'+obj.asset.title+'</a>';
        }
        return_text += '</div>';
        return {
            object:obj,
            htmlID:wrapperID,
            text:'<div id="'+wrapperID+'" class="annotation">'+return_text+'</div>'
        };
    };
    this.read = function(found_obj) {
        var rv = {
            metadata : {},
            view : {},
            annotations : []
        };
        var asset_elts = asset_mf.find(found_obj.html);
        if (asset_elts.length) {
            // /NOT compatible with many
            rv.asset = asset_mf.read(asset_elts[0]);
        }

        var data_elt = getFirstElementByTagAndClassName('div',
                'annotation-data', found_obj.html);
        var ann_title = getFirstElementByTagAndClassName('div',
                'annotation-title', found_obj.html);
        if (ann_title)
            rv.metadata['title'] = ann_title.textContent;
        var ann_data = evalJSON(data_elt.getAttribute('data-annotation'));
        
        // /TODO: remove these--maybe we can with no problem
        ann_data.start = parseInt(data_elt.getAttribute('data-begin'), 10);// CHOP
        ann_data.end = parseInt(data_elt.getAttribute('data-end'), 10);// CHOP
        ann_data.startCode = video.secondsToCode(ann_data.start);// CHOP
        ann_data.endCode = video.secondsToCode(ann_data.end);// CHOP
        rv.annotations.push(ann_data);
        return rv;
    }

}
function DjangoSherd_NoteList() {
}

function DjangoSherd_NoteForm() {
    var self = this;
    Sherd.Base.DomObject.apply(this, arguments);// inherit
    this.storage = {
        update : function(obj) {
            var range1 = '0';
            var range2 = '0';
            if (obj.start || obj.end) {// video
                range1 = obj.start;
                range2 = obj.end;
            } else if (obj.x) {// image
                range1 = obj.x;
                range2 = obj.y;
            }
            // top is the form
            self.components.top['annotation-range1'].value = range1;
            self.components.top['annotation-range2'].value = range2;
            self.components.top['annotation-annotation_data'].value = serializeJSON(obj);// TODO
                                                                                            // obj!
        }
    }
    // TODO: less barebones
    // 1. send signal for updates when replaced
}

/*******************************************************************************
 * 'temp' VITAL adaption (instead of using sherd
 ******************************************************************************/

// carryover from vital--should return whether a clip should be visible
// used for clipstrip setting (see initClipStrip() )
function currentUID() {
    return true;
    // just returning true, will show the markers at 0, but hey, so what
}

function openCitation(url, no_autoplay_or_options) {
    // /# where is my destination?
    // /# is there an annotation/asset already there?
    // /# if same: leave alone
    // /# else:
    // /# unload oldasset,
    // /# load asset
    // /# else: load asset
    // /# is annotation not-present?
    // /# load annotation (with options (e.g. autoplay)
    // /# update local views
    // /# e.g. location.hash

    ///legacy support: no_autoplay used to be a boolean, but now its options dict
    var options = ((typeof no_autoplay_or_options == 'boolean')
		   ? {autoplay:!no_autoplay_or_options}
		   : no_autoplay_or_options || {autoplay:true}
		  );
    var id = url.match(/(\d+)\/$/).pop();

    djangosherd.storage.get({id:id}, function(ann_obj) {
	var asset_target = ((options.targets && options.targets.asset) 
			    ? options.targets.asset
			    : 'videoclipbox');
        showElement(asset_target);
        var $$$$= getFirstElementByTagAndClassName;
        var targets = {
            "top":asset_target,
            "clipstrip":$$$$('div','clipstrip-display',asset_target),
            "asset":$$$$('div', 'asset-display',asset_target),
            "asset_title":$$$$('div', 'asset-title',asset_target),
            "annotation_title":$$$$('div', 'annotation-title',asset_target)
        };
        if (targets.annotation_title) {
            targets.annotation_title.innerHTML = ((ann_obj.metadata
                                                   && ann_obj.metadata.title
                                                  ) ? '<h2>'+ann_obj.metadata.title+'</h2>'
                                                  : '');
        }
        if (ann_obj.asset) {
            ann_obj.asset.autoplay = (options.autoplay) ? 'true' : 'false'; // ***
            ann_obj.asset.presentation = 'small';

            if (targets.asset_title) {
                targets.asset_title.innerHTML = ((ann_obj.asset.title 
                                                  && ann_obj.asset.local_url
                   ) ? 'from <a href="'+ann_obj.asset.local_url+'">'+ann_obj.asset.title+'</a>'
                     : '');
                if (ann_obj.asset.xmeml && window.is_staff ) {
                    targets.asset_title.innerHTML += ' (<a href="/annotations/xmeml/'+id+'/">download FinalCut xml</a>)';
                }
                
            }
            djangosherd.assetview.html.push(targets.asset, {
                asset : ann_obj.asset,
		targets: {clipstrip:targets.clipstrip}
            });
        
            var ann_data = ann_obj.annotations[0];// ***
            djangosherd.assetview.setState(ann_data);        
        } else {
            djangosherd.assetview.html.remove();
        }

        if (!/WebKit/.test(navigator.userAgent)) {
            //WebKit doesn't replace history correctly
            document.location.replace('#annotation=annotation' + id);
        }
        if (djangosherd.onOpenCitation) {
            djangosherd.onOpenCitation(id,ann_obj,options,targets);
        }
    });
}

/**
 * **random thoughts what is in the user's control context (C)? 0. asset layers -
 * announce they want focus (but need instantiation) -- arguments are asset, and
 * layers object --in place? the presenter decides 1. an asset presenter (in
 * focus) (V) - some assets can announce that they've gained focus - e.g. when
 * someone clicks play or starts panning/zooming, etc. 2. an annotator
 * (decorated on the presenter?) (C) - (edit/create mode): has state about how
 * the user is entering info - connected (deeply) to the asset-type 3.
 * annotation layers (V): - has a storage/collection source -signals
 * selection,editing TO controller -receives signal to update (from storage),
 * possibly with args (to narrow what should be updated) (only for
 * creating/editing mode) 3. a collection (i.e. storage) of annotations (M) -
 * for default 'save' target
 * 
 * STORIES: when an asset changes in the presenter (?what happens to the layers,
 * etc) (?annotators) when a layer wants focus of an asset that's not in view
 * -or two assets at once? --maybe one 'annotation layer' is two presenters
 * within it? --what would this do to 'focus' wrt replacement? (just because
 * focus went somewhere doesn't mean it should be the destination of other asset
 * loads)
 * 
 * IMMEDIATE USE CASES 1. form targets a layer (which is auto-generated) 2. all
 * clips from class (navigation, only) (all annotations - with colors) 3. all
 * clips (read-only) from a certain person (navigation)
 * 
 */
