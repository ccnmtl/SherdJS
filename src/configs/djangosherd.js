//requires MochiKit
if (typeof djangosherd == 'undefined') {
    djangosherd = {};
}

// /assetview: html.pull,html.push,html.remove,setState,getState,&OPTIONAL:play
// / pull,push are supported by Base.AssetView, but in, turn, call:
// / id, microformat.update, microformat.write, microformat.create
// / when attached to clipform: media.duration,media.movscale (and probably
// media.time)

function DjangoSherd_Asset_Config() {
    var ds = djangosherd;
    ds.assetMicroFormat = new DjangoSherd_AssetMicroFormat();
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();
    ds.noteform = new DjangoSherd_NoteForm();// see below
    // djangosherd.clipstrip = new ClipStrip();

    addLoadEvent(function() {
        // /# Find assets.
        ds.dom_assets = ds.assetMicroFormat.find();
        if (!ds.dom_assets.length)
            return;// no assets!
        // GenericAssetView is a wrapper in ../assets.js.
        ds.assetview = new Sherd.GenericAssetView( {
            'clipform' : true,
            'storage' : ds.noteform
        });

        // ds.clipstrip.html.put($('clipstrip'));
        var obj_div = getFirstElementByTagAndClassName('div', 'asset-display');// id=videoclip
        ds.assetview.html.push(obj_div, {
            asset : ds.assetMicroFormat.read(ds.dom_assets[0])
        });

        // /# Editable? (i.e. note-form?)
        ds.noteform.html.put($('clip-form'));
        // /# load asset into note-form
        ds.assetview.clipform.html.push('videonoteform', {
            asset : {}
        }); // write videoform
        
        ds.assetview.clipform.initialize(); // build listeners
        
        var orig_annotation_data = $('original-annotation');// /***faux layer
        if (orig_annotation_data != null) {
            var obj = false;
            try {
                // /#initialize for editing
                obj = evalJSON(orig_annotation_data
                        .getAttribute('data-annotation'));

                ds.assetview.setState(obj);
                ds.assetview.clipform.setState(obj);
               
            } catch (e) {/* non-valid json? */
            }
        } else {
            var annotation_query = [];
            if (document.location.hash) {
                // /TODO:?why should queryformat be on clipform? maybe local
                // default?
                annotation_query = ds.assetview.clipform.queryformat
                        .find(document.location.hash);
            }
            if (annotation_query.length) {
                // /#initialize view from hash
                ds.assetview.setState(annotation_query[0]);
            } else {
                // /#default initialization
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
    // GenericAssetView is a wrapper in ../assets.js
    ds.assetview = new Sherd.GenericAssetView( {/* no clipform */});

    if (!no_open_from_hash) {
        var annotation_to_open = String(document.location.hash).match(
                /annotation=annotation(\d+)/);
        if (annotation_to_open != null) {
            addLoadEvent(function() {
                openCitation(annotation_to_open[1] + '/', true);
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
                if (ann_obj.asset.type == 'image') {// CAN THUMB?
                        var view = new Sherd.Image.OpenLayers();
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
        forEach($$('a.materialCitation'), function(elt) {// MOCHI
                    var url = elt.getAttribute('href');
                    connect(elt, 'onclick', function(evt) {
                        openCitation(url);
                        evt.preventDefault();// don't open href
                        });
                });
    });
}

// Object: DjangSherd_AssetMicroFormat
// Find and Return the assets listed in the page
// Assets are within a div called "asset-links"
// asset-primary -- the actual link to the media (image/video/etc.)
// assetlabel-X -- tells you what type the asset is. e.g. assetlabel-youtube is youtube, assetlabel-url is the "viewable" link to the media
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
                        rv[reg[1]] = elt.getAttribute('href');
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
        if (rv.quicktime) {
            // TODO refactor this into a quicktime specific file
            var poster = getFirstElementByTagAndClassName('img',
                    'assetimage-poster', found_obj.html);
            // TODO: dereference poster url
            // test on poster.width is to make sure it is loaded/loadable
            // / e.g. if poster.src gives a 500 error, then Quicktime will
            // super-barf
            // / and the video becomes comletely inaccessible
            rv.poster = ((poster && poster.width) ? poster.src
                    : '/site_media/js/sherdjs/media/images/click_to_play.jpg');
            return update(
                    rv,
                    {
                        type : 'quicktime',
                        url : rv.quicktime,
                        height : 256,
                        width : 320,
                        autoplay : 'false',
                        loadingposter : '/site_media/js/sherdjs/media/images/poster.gif'
                    });
        } else if (rv.youtube) {
            rv.type = 'youtube';
            return rv;
        } else if (rv.image) {
            rv.type = 'image';
            return rv;
        }
    }
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
            rv.metadata['title'] = ann_title.innerHTML;
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
            if (obj.start) {// video
                range1 = obj.start;
                range2 = obj.end;
            } else if (obj.x) {// image
                range1 = obj.x;
                range2 = obj.y;
            }
            // top is the form
            self.components.top['annotation-range1'].value = range1;
            self.components.top['annotation-range2'].value = range2;
            self.components.top['annotation-annotation_data'].value = serializeJSON(obj);// TODO obj!
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

var current_citation = false;
function openCitation(url, no_autoplay) {
    // /# where is my destination?
    // /# is there an annotation/asset already there?
    // /# if same: leave alone
    // /# else:
    // /# unload oldasset,
    // /# load asset
    // /# else: load asset
    // /# is annotation not-present?
    ///#    load annotation (with options (e.g. autoplay)
    ///# update local views
    ///#    e.g. location.hash
    var id = url.match(/(\d+)\/$/).pop();

    if (current_citation)
        removeElementClass(current_citation, 'active-annotation');
    current_citation = getFirstElementByTagAndClassName('div',
            'annotation' + id);
    addElementClass(current_citation, 'active-annotation');
    showElement('videoclipbox');

    var ann_obj = djangosherd.annotationMicroformat.read( {
        html : current_citation
    });///***faux layer
    var obj_div = getFirstElementByTagAndClassName('div', 'asset-display' /*TODO:parent!*/);

    if (ann_obj.asset) {
        ann_obj.asset.autoplay = (no_autoplay) ? 'false' : 'true'; //***
        ann_obj.asset.presentation = 'small';
        djangosherd.assetview.html.push(obj_div, {
            asset : ann_obj.asset
        });

        var ann_data = ann_obj.annotations[0];//***
        djangosherd.assetview.setState(ann_data);
    } else {
        djangosherd.assetview.html.remove();
    }
    document.location = '#annotation=annotation' + id;
}

/****random thoughts
 what is in the user's control context (C)?
 0. asset layers
 - announce they want focus (but need instantiation)
 -- arguments are asset, and layers object
 --in place?  the presenter decides
 1. an asset presenter (in focus) (V)
 - some assets can announce that they've gained focus
 - e.g. when someone clicks play or starts panning/zooming, etc.
 2. an annotator (decorated on the presenter?) (C)
 - (edit/create mode): has state about how the user is entering info
 - connected (deeply) to the asset-type
 3. annotation layers (V):
 - has a storage/collection source 
 -signals selection,editing TO controller
 -receives signal to update (from storage), possibly with args (to narrow what should be updated)
 (only for creating/editing mode)
 3. a collection (i.e. storage) of annotations (M)
 - for default 'save' target

 STORIES:
 when an asset changes in the presenter
 (?what happens to the layers, etc)
 (?annotators)
 when a layer wants focus of an asset that's not in view
 -or two assets at once?
 --maybe one 'annotation layer' is two presenters within it?
 --what would this do to 'focus' wrt replacement? 
 (just because focus went somewhere doesn't mean it should be the destination of other asset loads)

 IMMEDIATE USE CASES
 1. form targets a layer (which is auto-generated)
 2. all clips from class (navigation, only)
 (all annotations - with colors)
 3. all clips (read-only) from a certain person (navigation)

 */
