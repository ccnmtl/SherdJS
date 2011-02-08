//requires jQuery
if (typeof djangosherd == 'undefined') {
    djangosherd = {};
}

// /assetview: html.pull,html.push,html.remove,setState,getState,&OPTIONAL:play
// / pull,push are supported by Base.AssetView, but in, turn, call:
// / id, microformat.update, microformat.write, microformat.create
// / when attached to clipform: media.duration,media.timescale (and probably
// media.time)

function legacy_json(unparsed_json) {
    //workaround a bug from MochiKit's serializeJSON() method
    return unparsed_json.replace('"wh_ratio":NaN','"wh_ratio":null');
}

function DjangoSherd_Asset_Config() {
    var ds = djangosherd;
    ds.assetMicroFormat = new DjangoSherd_AssetMicroFormat();
    ds.annotationMicroformat = new DjangoSherd_AnnotationMicroFormat();
    ds.noteform = new DjangoSherd_NoteForm();// see below
    ds.storage = new DjangoSherd_Storage();

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
        ds.assetview.html.push(
            jQuery('div.asset-display').get(0), // id=videoclip
            {
                asset : ds.assetMicroFormat.read(ds.dom_assets[0])
            });

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
                obj = JSON.parse(legacy_json(
                    orig_annotation_data.getAttribute('data-annotation')));
                ds.assetview.setState(obj);
                if (ds.assetview.clipform)
                    ds.assetview.clipform.setState(obj);

            } catch (e) {/* non-valid json? */
                Sherd.Base.log(e);
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
}

function DjangoSherd_Project_Config(options) {
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

    if (options.project_json) {
        ds.storage.get({type:'project',id:'xxx',url:options.project_json});
    }

    if (options.open_from_hash) {
        var annotation_to_open = String(document.location.hash).match(
                /annotation=annotation(\d+)/);
        if (annotation_to_open != null) {
            addLoadEvent(function() {
                openCitation(annotation_to_open[1] + '/', {autoplay:false});
            });
        }
    }
    jQuery(function() {
        // /In published view: decorate annotation links
        DjangoSherd_decorate_citations(document);

        ///now done in project.js when the asset_column loads from an ajax call
        //DjangoSherd_createThumbs(jQuery('#materials').get(0));

    });
}

var current_citation = null;
function DjangoSherd_decorate_citations(parent) {
    ///decorate LINKS to OPEN annotations
    jQuery('a.materialCitation',parent).click(function(evt) {
        try {
            openCitation(this.href);
            if (current_citation) {
                jQuery(current_citation).removeClass('active-annotation');
            }
            jQuery(this).addClass('active-annotation');
            current_citation = this;
        } catch(e) {
            if (window.console) {
                console.log('ERROR opening citation:'+e.message);
            } 
            //if (!window.debug) return;
        }
        evt.preventDefault();
    });
}

function DjangoSherd_createThumbs(materials) {
    // /TODO: unHACK HACK HACK
    // /need to make this more abstracted--where should we test for 'can thumb'?
    var ds = djangosherd;
    jQuery(ds.annotationMicroformat.find(materials))
    .each(function(index) {
        var found_obj = this;
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
            var obj_div = document.createElement('div');
            obj_div.setAttribute('class','thumb');

            found_obj.html.parentNode.appendChild(obj_div);
            // should probably be in .view
            ann_obj.asset.presentation = 'thumb';
            // .asset is the only thing used right now
            view.html.push(obj_div, ann_obj);
            view.setState(ann_obj.annotations[0]);
        }
    });
}

function DjangoSherd_Storage() {
    /* read-only storage repo for annotation objects from MediaThread
     */
    var self = this,
        _current_citation = false,
        recent_project = false,
        _cache = {
            'annotations':{},
            'asset':{},
            'project':{}
        };
    
    this.lastProject = function() {
        ///returns the last project info requested.
        ///used in /media/js/project/project.js of MediaThread
        return recent_project;
    }

    this.get = function(subject, callback, list_callback) {
        ///currently obj_type in [annotations, asset, project]
        /// that is used for the URL and a reference to the _cache{} section
        var id = subject.id,
            obj_type = subject.type || 'annotations',
            ann_obj = null,
            delay = false;
        if (id) {
            if (_current_citation) {
                jQuery(_current_citation).removeClass('active-annotation');
                _current_citation = null;
            }
            if (obj_type == 'annotations') {
                _current_citation = jQuery('div.annotation'+id).get(0);
                if (_current_citation != null)
                    jQuery(_current_citation).addClass('active-annotation');
            }
            if (id in _cache[obj_type] && !list_callback) {
                ann_obj = _cache[obj_type][id];
            } else if (_current_citation) {
                ann_obj = djangosherd.annotationMicroformat.read( {
                    html : _current_citation
                });// /***faux layer
            } else {
                jQuery.ajax({url:(subject.url || '/'+obj_type+'/json/'+id+'/'),
                             dataType:'json',
                             success:function(json) {
                                 var new_id = self.json_update(json, obj_type);
                                 if (callback) {
                                     id = (typeof new_id!='boolean')?new_id:id;
                                     callback(_cache[obj_type][id])
                                 }
                                 if (typeof list_callback==='function') {
                                     list_callback(json);
                                 }
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
        var new_id = true;
        if (json.project) {
            _cache['project'][json.project.id] = json.project;
            new_id = json.project.id;
            recent_project = json.project;
        }
        for (asset_key in json.assets) {
            var a = json.assets[asset_key];
            for (var j in a.sources) {
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
            _cache['annotations'][ann.id] = ann;
            if (json.type == 'asset' && i==0) {
                _cache['asset'][ann.asset_id] = ann;
            }
        }
        return new_id;
    };
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
        return jQuery('div.asset-links',dom).map(function() {
            return {"html": this };
        }).get();
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
        jQuery('a.assetsource',found_obj.html).each(function(index,elt) {
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
                    if (jQuery(elt).hasClass('asset-primary')) {
                        rv['width'] = wh[1];
                        rv['height'] = wh[2];
                    }
                }
            }
        });
        return DjangoSherd_adaptAsset(rv);//in-place
    };
}

function DjangoSherd_adaptAsset(asset) {
    if (asset.flv || asset.flv_pseudo || asset.mp4 || asset.mp4_pseudo || asset.mp4_rtmp || asset.flv_rtmp || asset.video_pseudo || asset.video_rtmp || asset.video || asset.mp3) {
        asset.type = 'flowplayer';
    } else if (asset.youtube) {
        asset.type = 'youtube';
    } else if (asset.quicktime) {
        asset.type = 'quicktime';
        ///Quicktime really needs a poster or loadingposter, or things fail
        if (asset.poster) {
            // test on poster.width is to make sure it is loaded/loadable
            // / e.g. if poster.src gives a 500 error, then Quicktime will
            // / and the video becomes comletely inaccessible
            var poster = document.createElement('img');
            poster.src = asset.poster;
            if (!poster.width) {
                asset.poster = '/site_media/js/sherdjs/media/images/click_to_play.jpg';
            }
        } else {
            asset.poster = '/site_media/js/sherdjs/media/images/click_to_play.jpg';
        }
        asset.url = asset.quicktime;  //TODO remove this and make sure quicktime.js uses .quicktime
        asset.loadingposter = '/site_media/js/sherdjs/media/images/poster.gif';
    } else if (asset.realplayer) {
        asset.type = 'realplayer';
    } else if (asset.ogg) {
        asset.type = 'videotag';
    } else if (asset.image) {
        asset.type = 'image';
        asset.thumbable = true;
    } else if (asset.image_fpx && asset.fsiviewer) {
        asset.type = 'fsiviewer';        
        asset.thumbable = true;
    } else if (asset.archive) {
        asset.type = "NONE";
    }
    return asset;
}
function DjangoSherd_AnnotationMicroFormat() {
    var asset_mf = new DjangoSherd_AssetMicroFormat();
    var video = new Sherd.Video.Helpers();
    this.find = function(dom) {
        dom = dom || document;
        return jQuery('div.annotation',dom).map(function() {
            return {"html" : this };
        }).get();
    };
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

        var data_elt = jQuery('div.annotation-data',found_obj.html).get(0);
        var ann_title = jQuery('div.annotation-title',found_obj.html).first()
                        .each(function(){
                            rv.metadata['title'] = this.textContent;
                        });
        

        try {
            var ann_data = JSON.parse(legacy_json(
                data_elt.getAttribute('data-annotation')));
       
            // /TODO: remove these--maybe we can with no problem
            ann_data.start = parseInt(data_elt.getAttribute('data-begin'), 10);// CHOP
            ann_data.end = parseInt(data_elt.getAttribute('data-end'), 10);// CHOP
            ann_data.startCode = video.secondsToCode(ann_data.start);// CHOP
            ann_data.endCode = video.secondsToCode(ann_data.end);// CHOP
            rv.annotations.push(ann_data);
        } catch(e) {/* non-valid json? */
            Sherd.Base.log(e);
        }
        return rv;
    };

}
function DjangoSherd_NoteList() {
}

window.DjangoSherd_Colors = new (function() {
    this.get = function(str) {
        return (this.current_colors[str]
                || (this.current_colors[str] = this.mapping(++this.last_color)));
    }
    this.mapping = function(num) {
        var hue = (num*30) % 240;
        var sat = 100 - (parseInt(num*30 / 240)%3 * 40);
        var lum = 55 + 5 * ((parseInt(num*30 / 240 / 3 ) % 5));
        return this.hsl2rgb(hue,sat,lum);
    }
    this.hsl2rgb = function(h,s,l) {
        var rgb = hsl2rgb(h,s,l);
        return 'rgb('+parseInt(rgb.r)+','+parseInt(rgb.g)+','+parseInt(rgb.b)+')'
        //return 'hsl('+h+','+s+'%,'+l+'%)'; //only for hsl() supported browsers: IE9+everyone else
    }
    this.reset = function() {
        this.last_color = -1;
        this.current_colors = {};
    }
    this.reset();

    function HueToRgb(m1, m2, hue) {
	var v;
	if (hue < 0)
		hue += 1;
	else if (hue > 1)
		hue -= 1;
	if (6 * hue < 1)
		v = m1 + (m2 - m1) * hue * 6;
	else if (2 * hue < 1)
		v = m2;
	else if (3 * hue < 2)
		v = m1 + (m2 - m1) * (2/3 - hue) * 6;
	else
		v = m1;
	return 255 * v;
    }
    function hsl2rgb(h, s, l) {
	var m1, m2, hue;
	var r, g, b
	s /=100;
	l /= 100;
	if (s == 0)
		r = g = b = (l * 255);
	else {
		if (l <= 0.5)
			m2 = l * (s + 1);
		else
			m2 = l + s - l * s;
		m1 = l * 2 - m2;
		hue = h / 360;
		r = HueToRgb(m1, m2, hue + 1/3);
		g = HueToRgb(m1, m2, hue);
		b = HueToRgb(m1, m2, hue - 1/3);
	}
	return {r: r, g: g, b: b};
    }

})();

function DjangoSherd_NoteForm() {
    var self = this;
    Sherd.Base.DomObject.apply(this, arguments);// inherit
    this.form_name = 'clip-form';
    this.f = function(field) {
        //returns field from form, but without keeping pointers around
        return document.forms[self.form_name].elements[field];
    }
    this.storage = {
        update : function(obj) {
            var range1 = '0';
            var range2 = '0';
            function numOrEmpty(v) {
                return v || ((v==0) ? v: '' );
            }
            ///if isNaN, then it's an empty value to be saved as null
            if (obj.start || obj.end) {// video
                range1 = numOrEmpty(obj.start);
                range2 = numOrEmpty(obj.end);
            } else if (obj.x) {// image
                range1 = numOrEmpty(obj.x);
                range2 = numOrEmpty(obj.y);
            }
            // top is the form
            self.f('annotation-range1').value = range1;
            self.f('annotation-range2').value = range2;

            self.f('annotation-annotation_data').value = JSON.stringify(obj);
            ///TODO: eventually this whole DjangoSherd_NoteForm will
            ///      BE part of AnnotationList -- or a wrapper
            if (window.AnnotationList) {
                AnnotationList.clearAnnotation();
            }
        }
    };
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
    var options = {///defaults
        autoplay:true,
        presentation:'small'
    };
    ///legacy support: no_autoplay used to be a boolean, but now its options dict
    if (typeof no_autoplay_or_options == 'boolean') {
        options.autoplay = !no_autoplay_or_options;
    } else {
        for (a in no_autoplay_or_options) {
            options[a] = no_autoplay_or_options[a];
        }
    }
    var ann_url = url.match(/(asset|annotations)\/(\d+)\/$/);
    var id = ann_url.pop();
    var return_value = {};
    djangosherd.storage.get({id:id,type:ann_url[1]}, function(ann_obj) {
	var asset_target = ((options.targets && options.targets.asset) 
			    ? options.targets.asset
			    : document.getElementById('videoclipbox'));
	jQuery(asset_target).show();
        var targets = {
            "top":asset_target,
            "clipstrip":jQuery('div.clipstrip-display',asset_target).get(0),
            "asset":jQuery('div.asset-display',asset_target).get(0),
            "asset_title":jQuery('div.asset-title',asset_target).get(0),
            "annotation_title":jQuery('div.annotation-title',asset_target).get(0)
        };
        if (targets.annotation_title) {
            targets.annotation_title.innerHTML = ((ann_obj.metadata
                                                   && ann_obj.metadata.title
                                                  ) ? '<h2>'+ann_obj.metadata.title+'</h2>'
                                                  : '');
        }
        if (ann_obj.asset) {
            ann_obj.asset.autoplay = (options.autoplay) ? 'true' : 'false'; // ***
            ann_obj.asset.presentation = options.presentation || 'small';

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
            djangosherd.assetview.setState(ann_data, {autoplay:options.autoplay});        
        } else {
            djangosherd.assetview.html.remove();
        }

        return_value['onUnload'] = djangosherd.assetview.html.remove;
        return_value['view'] = djangosherd.assetview;
        return_value['object'] = ann_obj;
        return_value['id'] = id;

        if (!/WebKit/.test(navigator.userAgent)) {
            //WebKit doesn't replace history correctly
            document.location.replace('#annotation=annotation' + id);
        }

        if (typeof options.callback=='function') {
            options.callback(return_value);
        }
        if (djangosherd.onOpenCitation) {
            djangosherd.onOpenCitation(id,ann_obj,options,targets);
        }
    });
    return return_value;
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
