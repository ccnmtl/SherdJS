/* SherdJS Bookmarklet
HOW IT IS RUN:
  This is the main file for MediaThread bookmarklet code.  It is not
  the actually bookmarklet that the user installs

  -- this way, changes to this file will be run without users needing
     to reinstall the bookmarklet.  In MediaThread, the actual
     bookmarklet is here:
     https://github.com/ccnmtl/mediathread/blob/master/templates/assetmgr/bookmarklet.js
     And this file (through a symlink and urls.py redirection) becomes
     available through /bookmarklets/analyze.js

DEPENDENCIES:
  Large parts of this file now depend on jQuery.  This must be
  embedded by the actual bookmarklet, preferably before this file, but
  if not, it can be loaded, and then call
  SherdBookmarklet.onJQuery(jQuery)

ARCHITECTURE:
  Everything lives within two namespaces: window.SherdBookmarklet and
  window.SherdBookmarkletOptions.

  SherdBookmarkletOptions is a dictionary which can (and must to work
    as a bookmarklet) be created before this file is loaded.  This
    way, if required, this file could also be used as a library.  In
    this scenario, if a site wanted an 'AnalyzeThis' button to work
    without a user needing to install a bookmarklet, then this file
    would be loaded, and the button would call into
    SherdBookmarklet.runners['jump'] (or .decorate).

  A typical SherdBookmarkletOptions set of values would be 
     {'action':'jump', 'host_url':'http://mediathread.example.com/save/?', 'flickr_apikey':'foobar123456789'}

  The 'action' mostly services the bookmarklet, but in theory, this
     separates the initialization code along with what the
     bookmarklet's action would be -- to immediatley jump into
     mediathread or to display the options list (which is more often
     the default).

  Basic parts:
     .hosthandler.* : This dictionary is a list of all special-cased
                      hosts.  When these keys match anywhere (so
                      university proxies will work) in
                      document.location, then this code will be
                      preferred rather than searching over the normal
                      media types.  This should be a method of last
                      resort -- supporting generic media-types is much
                      better, but this can be especially useful when
                      looking for metadata.

         find:function(callback) = this is the function, which fill find assets and then run
              callback([array of assets -- see below for datastructure]) 
                       -- async allows you to make ajax calls, or whatever else you need

         allow_save_all = if true, there will be an interface on the
                          bottom to save all assets at once.  This is
                          somewhat experimental -- used to load a
                          whole course from VITAL into MediaThread

         also_find_general = if true, then the normal media type
                             queries will be run.  This is a good way
                             to implement custom metadata searches,
                             without rewriting support for media.
                             Also, see the youtube.com example for a
                             way to call into the general media types
                             to search for a particular kind of media,
                             without duplicating code.


     .assethandler.* : This is where all the methods are that look for
                       media or metadata on the page.  Each key:value
                       is run with the bookmarklet for a chance to
                       find its kind of assets, and, if found, query
                       for more data.

                       Besides finding media, an assethandler can also find metadata,
                       and if the metadata can only be pinned to 'something on the page'
                       then you should set "page_resource":true in the assethandler dict.

                       Each .find method is called as
                       find.apply(assethandler,callback,{window:window,document:document})

                          note: use the context passed into the method
                                rather than global window/document
                                objects, since the bookmarklet
                                supports deeply embedded
                                frames/iframes and the context might
                                be different The .find method is
                                responsible for eventually calling
                                callback([array of assets]) with a
                                blank array if none are found.


                          The asset objects passed back should have the following structure:
                                 {html:<dom object of media>,
                                  primary_type:<string of the sources key 
                                                most important for this media.  e.g. 'video' >,
                                  sources:{
                                     title:<title string.  if omitted, it will 
                                            be discerned from the primary_type's filename>,

                                     url: <only use if you want to
                                          override the url that is
                                          displayed to the user as a
                                          link to get back to the
                                          archive's page for the
                                          asset.  mostly this is just
                                          document.location>

                                     <key:values of urls that will be
                                                 stored in the asset's Source
                                                 objects in MediaThread>

                                     <key>-metadata: <metadata for the source 
                                             key in the form of "w<width>h<height>" >
                                  },

                                  metadata:{ <key, value pairs for metadata.  
                                             Values should always be an array of strings> 
                                           }

                                 }
          .assethandler.objects_and_embeds.*
                Since a large subset of assethandlers look for an
                object or embed tag, and dancing between duplicate
                versions often appear in sites, the general code is
                handled as a big assethandler with sub-handlers for checking object and embed tags.  It's important to look at examples for good practices on how to go through these elements.  These have two main functions:
                 
                 .match(embed_or_object) = this function should ===null if the embed/object tag does not match, and can return anything else, if it does match.
                 .asset(embed_or_object,match_rv,context,index,optional_callback)
                       @match_rv = whatever .match returned
                       @optional_callback = you can just return the asset_object directly 
                                but if you need to do ajax, or callback-based apis to get all the
                                info/metadata, then you can return an asset object with with a
                                "wait":true key, and then call 
                                  optional_callback(@index, asset_object) where @index is the
                                    index argument passed to .asset.
          
                          
     runners : as described above, runners are alternate 'setups' that mediathread can be run in.
               'jump' generally means if one asset is found on the page jump right into mediathread
               'decorate' means bring up the Bookmarklet.Interface and let the user take another
                   action.  This is probably the best one going forward.

     HELP FUNCTIONS:
         connect: quick cross-browser event-listener
         hasClass(elem,cls), 
         hasBody(doc) -- does it have a doc.body value?  <frameset> pages do NOT
         clean(str), getImageDimensions(), mergeMetadata(),
         xml2dom(str,xhr), absolute_url(),
         elt() for creating new html in a way that is frame/browser friendly

     Finder() : This object is the main thing that walks through the document's media through
                any sub-frames and merges the results into a list.

     Interface() : This is the object that creates and manages the bookmarklet interface
                   (The gray widget that appears, listing the assets, and presenting the
                     analyze buttons, etc.)

                   This interface calls Finder() and displays the results
     
     FOOTER:
       At the bottom of this file is the init/bootstrap code which runs the right part of
       SherdBookmarklet.* (generally a runner) after inspecting SherdBookmarkletOptions

       Chrome bookmarklet case is for when this same code is used as a library in the chrome
         bookmarklet.  See: src/bookmarklets/browser_extensions/google_chrome in this repo.
     
*/

SherdBookmarklet = {
  "user_status": {/* updated by /accounts/logged_in.js */
      ready:false
  },
  run_with_jquery:function(func) {
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
      if (jQ) {
          func(jQ);
      } else {
          SherdBookmarkletOptions.onJQuery = func;
      }
  },
  user_ready:function() {
      return SherdBookmarklet.user_status.ready;
  },
  needs_update:function() {
      return !SherdBookmarklet.user_status.current;
  },
  update_user_status:function(user_status) {
      var uninit = (! window.SherdBookmarklet.user_status.ready);
      for (var a in user_status) {
          window.SherdBookmarklet.user_status[a] = user_status[a];
      }
      if (window.console) {
          window.console.log(user_status);
      }

      if ('youtube_apikey' in user_status) {
          window.SherdBookmarklet.options.youtube_apikey = user_status.youtube_apikey;
      }

      if ('flickr_apikey' in user_status) {
          window.SherdBookmarklet.options.flickr_apikey = user_status.flickr_apikey;
      }

      //Safari sometimes loads logged_in.js last, even when added first
      if (uninit && user_status.ready && SherdBookmarklet.g) {
          //find assets again
          SherdBookmarklet.g.findAssets();
      }
  },
  "hosthandler": {
    /*Try to keep them ALPHABETICAL by 'brand' */
    "alexanderstreet.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {
                var token = document.documentElement.innerHTML.match(/token=([^&\"\']+)/);
                if (! token) {
                    return callback([]);
                }
                jQuery
                .ajax({url:"http://"+location.hostname+"/video/meta/"+token[1],
                       dataType:'json',
                       dataFilter: function(data,type) {
                           ///removes 'json=' prefix and unescapes content
                           return unescape(String(data).substr(5));
                       },
                       success:function(json,textStatus) {
                           var rv = [];
                           function deplus(str,arr) {
                             if (str) {
                               return ((arr)?[str.replace(/\+/g,' ')]:str.replace(/\+/g,' '));
                             }
                           }
                           if (json) {
                               if (json.tracks && json.tracks.length > 0 && json.tracks[0].chunks.length > 0) {
                                   var t = json.tracks[0];
                                   var i = 0; //ASSUME: all chunks refer to same video file?
                                   var asp_vid = {
                                       "primary_type":"video_rtmp",
                                       "sources":{
                                           'title':deplus(t.title),
                                           'video_rtmp':t.chunks[i].high.split('?')[0],
                                           'video_rtmp_low':t.chunks[i].low.split('?')[0]
                                       },
                                       "metadata":{},
                                       "_jsondump":json
                                   };
                                   for (var a in t.metadata) {
                                       if (t.metadata[a] && ! /id$/.test(a)) {
                                           asp_vid.metadata[a] = [ deplus(t.metadata[a])];
                                       }
                                   }
                                   rv.push(asp_vid);
                               } else if (json.video && json.video.length > 0) {
                                   var v = json.video[0];
                                   rv.push({
                                       "primary_type":"video_rtmp",
                                       "sources":{
                                           'title':deplus(v.title),
                                           'video_rtmp':v.high.split('?')[0],
                                           'video_rtmp_low':v.low.split('?')[0]
                                       },
                                       "metadata":{
                                           'Copyright':deplus(v.copyright,1)||undefined,
                                           'Publication Year':deplus(v.publicationyear,1)||undefined,
                                           'Publisher':deplus(v.publisher,1)||undefined
                                       },
                                       "_jsondump":json
                                   });
                               }
                           }
                           return callback(rv);
                       },
                       error:function() { callback([]); }
                      });
            });
        }
    },
    "artstor.org": {
        find:function(callback) {
            /*must have floating pane open to find image*/
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {
                var found_images = [];
                var floating_pane = jQuery(".MetaDataWidgetRoot");
                var selected_thumbs = jQuery(".thumbNailImageSelected");
                if (floating_pane.length) {
                    var dom = floating_pane.get(0);
                    found_images.push({
                        "artstorId":dom.id.substr(3),/*after 'mdw'*/
                        "sources":{},"metadata":{},"primary_type":'image_fpx',
                        "html":dom
                    });
                } else if (selected_thumbs.length) {
                    selected_thumbs.each(function() {
                        found_images.push({
                            "artstorId":dijit.byId(String(this.id).split('_')[0]).objectId,
                            "sources":{},"metadata":{},"primary_type":'image_fpx',
                            "html":this
                        });
                    });
                } else {
                    return callback([],"Try selecting one or more images by clicking on a thumbnail.");
                } 
                var done = found_images.length * 2; //# of queries
                var obj_final = function() {
                    return callback(found_images);
                };
                for (var i=0;i<found_images.length;i++) {
                    function getArtStorData(obj) {
                        jQuery
                        .ajax({url:"http://"+location.hostname+"/library/secure/imagefpx/"+obj.artstorId+"/103/5",
                               dataType:'json',
                               success:function(fpxdata,textStatus) {
                                   var f = fpxdata[0];
                                   obj.sources.fsiviewer = "http://viewer2.artstor.org/erez3/fsi4/fsi.swf";
                                   obj.sources.image_fpxid = obj.artstorId;
                                   obj.sources["image_fpxid-metadata"] = "w"+f.width+"h"+f.height;
                                   if (--done===0) obj_final();
                               },
                               error:function(){
                                   if (--done===0) obj_final();
                               }
                              });
                        jQuery
                        .ajax({url:"http://"+location.hostname+"/library/secure/metadata/"+obj.artstorId,
                               dataType:'json',
                               success:function(metadata,textStatus) {
                                   var img_link = metadata.imageUrl.match(/size\d\/(.*)\.\w+$/);
                                   obj.sources.title = metadata.title;
                                   obj.sources.thumb = "http://library.artstor.org"+metadata.imageUrl;
                                   var m = metadata.metaData;
                                   for (var i=0;i<m.length;i++) {
                                       ///so multiple values are still OK
                                       if (m[i].fieldName in obj.metadata) {
                                           obj.metadata[m[i].fieldName].push(m[i].fieldValue);
                                       } else {
                                           obj.metadata[m[i].fieldName] = [m[i].fieldValue];
                                       }
                                   }
                                   if (--done===0) obj_final(); 
                               },
                               error:function(){
                                   if (--done===0) obj_final(); 
                               }
                              });
                    }
                    getArtStorData(found_images[i]);
                }
            });
        }
    },
    "blakearchive.org": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function(jQ) { 
                var SB = SherdBookmarklet;
                var obj = {'sources':{"title":document.title},'metadata':{}};
                try {
                    var opt_urls = document.forms.form.elements.site.options;
                } catch(e) {
                    return callback([]);
                }
                var abs = SB.absolute_url;
                for (var i=0;i<opt_urls.length;i++) {
                    var o = opt_urls[i];
                    if (/Image/.test(o.text)) {
                        obj.sources.image = abs(o.value,document);
                    } else if (/Transcription/.test(o.text)) {
                        obj.sources.transcript_url = abs(o.value,document);
                        obj.metadata.Transcript = [abs(o.value,document)];
                    }
                }
                if (obj.sources.image) {
                    jQ('a').filter(function(){
                        return /Copy\s+Information/.test(this.innerHTML);
                    }).each(function(){
                        obj.metadata.Metadata = [
                            abs(String(this.href)
                                .replace(/javascript:\w+\(\'/,'')
                                .replace(/\'\)$/,''),
                                document)
                        ];
                    });
                    SB.getImageDimensions(
                        obj.sources.image,
                        function onload(img,dims)
                        {
                            obj.sources["image-metadata"] = dims;
                            callback([obj]);
                        },function error(){
                            callback([]);//perhaps overly extreme?
                        });
                }
            });            
        }
    },
    // first version of this added by Eddie 10/28/11:
    "classpop.ccnmtl.columbia.edu": {
        find:function(callback) {           
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {                
                if (jQuery ('#currently_playing').length > 0) {
                    
                    // the YouTube id is passed up via a postMessage
                    // from the inner iframe and displayed in
                    // a special "currently playing" div
                    var tmp = jQuery ('#currently_playing').html();
                    var v_match =  ["video_id=" + tmp,  tmp];
                    
                    // not sure we need this as of right now: to start out with.
                    // i'm just using an empty div.
                    var video_dom_object = jQuery ("<div></div>");
                    
                    SherdBookmarklet.assethandler.objects_and_embeds.players
                    .youtube.asset(
                       video_dom_object, 
                       v_match,
                       {
                           'window':window,
                           'document':document
                       },
                       0,
                       function(ind,rv){ callback([rv]); }
                   );
                }
                else {
                    callback([]);
                }
            });//end run_with_jquery for classpop.ccnmtl.columbia.edu
        },
        decorate:function(objs) {
        }
     },    
    "dropbox.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function(jQ) { 
            var save_link = document.getElementById('gallery_full_size');
            if (save_link) {
                var regex = String(save_link.href).match(/dropbox.com\/s\/[^\/]+\/([^?]+)/);
                if (regex) {
                    var img = document.createElement("img");
                    img.src = save_link;
                    jQ(img).bind('load',function() {
                        callback([{
                            primary_type:'image',
                            sources:{
                                'title':regex[1],
                                'image':img.src,
                                'url':String(document.location),
                                'image-metadata':"w"+img.width+"h"+img.height
                            }
                        }]);
                    });
                } else callback([]);
                
            } else callback([]);
            });
        }
    },
    "flickr.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function(jQuery) { 
                var apikey = SherdBookmarklet.options.flickr_apikey;
                // expected:/photos/<userid>/<imageid>/
                var bits = document.location.pathname.split("/");
                var imageId = bits[3];
                window.imageId = imageId;
                if(imageId === undefined){
                  return callback([]);
                }
                
                if (imageId.length < 1 || imageId.search(/\d{1,12}/) < 0)
                    return callback([]);

                /* http://docs.jquery.com/Release:jQuery_1.2/Ajax#Cross-Domain_getJSON_.28using_JSONP.29 */
                var baseUrl = "https://api.flickr.com/services/rest/?format=json&api_key=" +
										apikey+"&photo_id="+imageId+
										((SherdBookmarklet.options.cross_origin) ? '&nojsoncallback=1' : '&jsoncallback=?');
                jQuery.getJSON(baseUrl + "&method=flickr.photos.getInfo",function(getInfoData) {
                        if (getInfoData.photo === undefined || getInfoData.photo.media=="video") {
                            /*video is unsupported*/
                            return callback([]);
                        }
                        jQuery.getJSON(baseUrl + "&method=flickr.photos.getSizes",
                            function(getSizesData) {
                                var w=0, 
                                    h=0,
                                    img_url='',
                                    thumb_url='';
                                jQuery.each(getSizesData.sizes.size, function(i,item) {
                                    if (parseInt(item.width) > w) {
                                        w = parseInt(item.width);
                                        h = item.height;
                                        img_url = item.source;
                                    }
                                    if (item.label == "Thumbnail") {
                                        thumb_url = item.source;
                                    }
                                });
                                var img;
                                jQuery('img').each(function() {
                                    if (RegExp("http://farm.*"+imageId).test(this.src)) {
                                        img = this;
                                    }
                                });
                                /* URL format http://farm{farm-id}.static.flickr.com/{server-id}/{id}_{secret}_[mtsb].jpg */
                                var sources = {
                                        "url": getInfoData.photo.urls.url[0]._content,
                                        "title": getInfoData.photo.title._content,
                                        "thumb": thumb_url,
                                        "image": img_url,
                                        "metadata-photostream": "http://www.flickr.com/photos/" + getInfoData.photo.owner.nsid, /* owner's photostream */
                                        "image-metadata":"w"+w+"h"+h,
                                        "metadata-owner":getInfoData.photo.owner.realname ||undefined
                                    };

                                return callback( [{html:img, primary_type:"image", sources:sources}] );
                            });
                });/*end jQuery.ajax*/
            });/*end run_with_jquery*/
        },
        decorate:function(objs) {
        }
    },
    "mirc.sc.edu": {
      find:function(callback){
        SherdBookmarklet.run_with_jquery(function _find(jQuery) {
          if(jQuery("a.usc-flowplayer > :first").is('img')){
            //This works inconsistently...so I'm going to put up a warning as a workaround
            // var fp = jQuery(".usc-flowplayer").flowplayer(0);
            // fp.load(); //bring up the flowplayer "object"
            alert("Please start playing the video you would like to collect.");
            return false;
          }

          //if(jQuery("a.usc-flowplayer > :first").is('img')) jQuery("a.usc-flowplayer").trigger("click");
          var fp_id = jQuery("a.usc-flowplayer > :first ").attr("id");
          // console.log(jQuery("a.usc-flowplayer").flowplayer(0));
          var video = document.getElementById(fp_id);
          if (video && video !== null) {
            var v_match = SherdBookmarklet.assethandler.objects_and_embeds.players.flowplayer3.match(video); //the flowplayer version
            if (v_match && v_match !== null) {
              var fp_rv=SherdBookmarklet.assethandler.objects_and_embeds.players.flowplayer3.asset(video,v_match,{'window':window,'document':document});
            }
          }
          // if(typeof(fp)!='undefined') fp.unload();

          fp_rv.metadata = {};

          try { fp_rv.metadata.title = fp_rv.sources.title = [jQuery("#edit-title--2").text().split("\n")[2].trim()]; }
          catch (e) {fp_rv.metadata.title = ''}
          try { fp_rv.metadata.produced = [jQuery("#edit-production-date").text().split("\n")[2].trim()]; }
          catch (e) {fp_rv.metadata.produced = ''}
          try { fp_rv.metadata.description = [jQuery("#edit-description--2").text().split("\n")[2].trim()]; }
          catch (e) {fp_rv.metadata.description = ''}
          try { fp_rv.metadata.copyright = [jQuery("#edit-credits-preserved-by-rights").text().split("\n")[2].trim()]; }
          catch (e) {fp_rv.metadata.copyright = ''}
          try { fp_rv.metadata.temporal = [jQuery("#edit-tempo--2").text().split("\n")[2].trim()]; }
          catch (e) {fp_rv.metadata.temporal = ''}
          try { fp_rv.metadata.geographical = [jQuery("#edit-geo").text().split("\n")[2].trim()]; }
          catch (e) {fp_rv.metadata.geographical = ''}          
          try { 
            var tags = jQuery("#edit-subjects").html().replace(/<label(.*)<\/label>/g, "").split(/(<br>)+/);
            for(var i=tags.length-1; i>=0; i--) tags[i].trim()=='<br>' || tags[i].trim()=='' ? tags.splice(i, 1) : tags[i]=tags[i].trim();
            fp_rv.metadata.subject = tags;
          } catch (e) {fp_rv.metadata.tags = [];}
          try { 
            var credits = jQuery("#edit-credits").text().split('Donor')[0].split('Credits')[1].split('.');
            for(var i=credits.length-1; i>=0; i--) credits[i].trim()=='<br>' || credits[i].trim()=='' ? credits.splice(i, 1) : credits[i]=credits[i].trim();
            fp_rv.metadata.credits = credits;
          } catch (e) {fp_rv.metadata.credits = [];}          

          fp_rv.sources.thumb="http://mirc.sc.edu/sites/all/modules/usc_mirc/images/playbuttonblack.jpg"

          return callback([fp_rv]);
        })
      },
      decorate:function(objs){
      }
    }, 
    "wikipedia.org":{
        find:function(callback) {
            var returnArray = [];
            var patt = /data/;// regex pattern for data url
            SherdBookmarklet.run_with_jquery(function(jQ){
                jQ('img').each(function(i){
                    var obj = {};
                    var source = jQuery(this).attr('src');
                    if (source.split('//').length < 3 && !patt.test(source)){
                        source = 'http://' + source.split('//')[1];
                        source = source.split('=')[0];
                        obj.html = this;
                        obj.sources = {};
                        obj.sources.image =  source;
                        obj.sources.title = jQuery(this).attr('alt');
                        obj.sources.url = window.location.href;
                        obj.primary_type = "image";
                        obj.sources.thumb = source;
                        obj.sources["image-metadata"] = 'w'+(this.width*2)+'h'+(this.height*2);
                        returnArray[i]=obj;
                      }
                }); //end each
            });
            return callback( returnArray );
          }
    },
    "googleartproject.com":{
        find:function(callback) {
            var returnArray = [];
            var patt = /data/;// regex pattern for data url
            SherdBookmarklet.run_with_jquery(function(jQ){
                jQ('img').each(function(i){
                    var obj = {};
                    var source = jQuery(this).attr('src');
                    if (source.split('//').length < 3 && !patt.test(source)){
                        source = 'http://' + source.split('//')[1];
                        source = source.split('=')[0];
                        obj.html = this;
                        obj.sources = {};
                        obj.sources.image =  source;
                        obj.sources.title = jQuery(this).attr('alt');
                        obj.sources.url = window.location.href;
                        obj.primary_type = "image";
                        obj.sources.thumb = source;
                        obj.sources["image-metadata"] = 'w'+(this.width*2)+'h'+(this.height*2);
                        returnArray[i]=obj;
                      }
                }); //end each
            });
            return callback( returnArray );
          }
    },
    "vital.ccnmtl.columbia.edu": {
        allow_save_all:true,
        find:function(callback) {
            if (! /materialsLib/.test(document.location.pathname)) {
                callback([],'Go to the Course Library page and run the bookmarklet again');
            }
            SherdBookmarklet.run_with_jquery(function(jQuery) { 
                var found_videos = [];
                var course_library = jQuery('a.thumbnail');
                var done = course_library.length;
                var obj_final = function() {
                    return callback(found_videos);
                };
                course_library.each(function() {
                    var asset = {
                        "html":this,
                        "vitalId":String(this.href).match(/\&id=(\d+)/)[1],
                        "sources":{'quicktime-metadata':"w320h240"},
                        "metadata":{},"primary_type":"quicktime"
                    };
                    jQuery.ajax({
                        url:'basicAdmin.smvc?action=display&entity=material&id='+asset.vitalId,
                        dataType:'text',
                        success:function(edit_html) {
                            var split_html = edit_html.split('Video Categories:');
                            ///Basic URLs and Title
                            split_html[0].replace(
                                new RegExp('<input[^>]+name="(\\w+)" value="([^"]+)"','mg'),
                                function(full,name,val) {
                                    switch(name) {
                                    case "title": asset.sources.title = val;break;
                                    case "url": asset.sources.quicktime = val;break;
                                    case "thumbUrl": asset.sources.thumb = val;break;
                                    }
                                });
                            ///don't procede if we didn't get the quicktime url
                            if (asset.sources.quicktime) {
                                ///TODO: VITAL Metadata
                                   //Topics = assignments
                                ///Extra Metadata
                                if (split_html.length > 1 ) {
                                    split_html[1].replace(
                                        new RegExp('<b>([^<]+):</b>[\\s\\S]*?value="([^"]+)"[\\s\\S]*?value="([^"]+)"','mg'),
                                        function(full,name,value_id,val) {
                                            asset.metadata[name] = [val];
                                        });
                                }
                                ///PUSH
                                found_videos.push(asset);
                            }
                            if (--done===0) obj_final(); 
                        },
                        error:function() {
                            if (--done===0) obj_final(); 
                        }
                    });
                        
                    
                });
            });            
        }
    },
    "learn.columbia.edu": {
    /*and www.mcah.columbia.edu */
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function(jQuery) { 
                var rv = [];
                var abs = SherdBookmarklet.absolute_url;
                jQuery('table table table img').each(function() {
                    var match_img = String(this.src).match(/arthum2\/mediafiles\/(\d+)\/(.*)$/);
                    if (match_img) {
                        var img = document.createElement("img");
                        img.src = "http://www.mcah.columbia.edu/arthum2/mediafiles/1200/"+match_img[2];
                        var img_data = {
                            'html':this,
                            'primary_type':'image',
                            'metadata':{},
                            'sources':{
                                "url":abs(this.getAttribute('onclick').match(/item.cgi[^\']+/)[0],document),
                                "thumb":this.src,
                                "image":img.src,
                                "image-metadata":"w"+img.width+"h"+img.height
                            }
                        };
                        if (typeof document.evaluate == 'function') {
                            //only do metadata if we can do XPath, otherwise, it's insane
                            var ancestor = jQuery(this).parents().get(9);
                            //td[5] for gallery searches, td[3] for image portfolios
                            var cell = (jQuery(ancestor).children('td').length==5) ? 'td[5]' : 'td[3]' ;
                            function tryEval(obj,name,xpath,inArray) {
                                var res = document.evaluate(xpath,ancestor,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null).snapshotItem(0);
                                if (res) {
                                    var v = res.textContent.replace(/\s+/,' ');
                                    obj[name] = ((inArray)?[v]:v);
                                }
                            }
                            //xpath begins right after the tbody/tr[2]/
                            tryEval(img_data.sources,'title',cell+'/table[2]/tbody/tr[3]/td/table/tbody/tr/td');
                            tryEval(img_data.metadata,'creator',cell+'/table[1]/tbody/tr[3]/td[1]/table/tbody/tr/td',true);
                            tryEval(img_data.metadata,'date',cell+'/table[1]/tbody/tr[3]/td[3]/table/tbody/tr/td',true);
                            tryEval(img_data.metadata,'materials',cell+'/table[3]/tbody/tr[3]/td[1]/table/tbody/tr/td',true);
                            tryEval(img_data.metadata,'dimensions',cell+'/table[3]/tbody/tr[3]/td[3]/table/tbody/tr/td',true);
                            tryEval(img_data.metadata,'techniques',cell+'/table[4]/tbody/tr[3]/td[1]/table/tbody/tr/td',true);
                            tryEval(img_data.metadata,'repository',cell+'/table[5]/tbody/tr[3]/td[1]/table/tbody/tr/td',true);
                            tryEval(img_data.metadata,'city',cell+'/table[5]/tbody/tr[3]/td[3]/table/tbody/tr/td',true);
                            tryEval(img_data.metadata,'note',cell+'/table[6]/tbody/tr[3]/td/table/tbody/tr/td',true);
                        }
                        rv.push(img_data);
                    }
                    
                });
                var done = 1;
                if (jQuery('#flashcontent embed').length) {
                    done = 0;
                    var p = document.location.pathname.split('/');
                    p.pop();
                    jQuery.ajax({
                        url:p.join('/')+'/gallery.xml',
                        dataType:'text',
                        success:function(gallery_xml,textStatus,xhr) {
                            var gxml = SherdBookmarklet.xml2dom(gallery_xml,xhr);
                            var i_path = jQuery('simpleviewerGallery',gxml).attr('imagePath');
                            var t_path = jQuery('simpleviewerGallery',gxml).attr('thumbPath');
                            jQuery('image',gxml).each(function() {
                                var filename = jQuery('filename',this).text();
                                var image_data = {
                                    "html":this,
                                    "primary_type":'image',
                                    "sources":{
                                        "title":jQuery('caption',this).text(),
                                        "image":abs(p.join('/')+'/'+i_path+filename,document),
                                        "thumb":abs(p.join('/')+'/'+t_path+filename,document),
                                        "url":document.location +'#'+ filename
                                    }
                                };
                                var img = document.createElement("img");
                                img.src = image_data.sources.image;
                                image_data.sources['image-metadata']="w"+img.width+"h"+img.height;
                                rv.push(image_data);
                                jQuery('#flashcontent').hide();
                                
                            });
                            return callback(rv);
                        },
                        error:function(err,xhr){ return callback(rv); }
                    });
                }
                if (done) return callback(rv);
            });
        }
    },
    "vimeo.com": {
        
        find: function(callback) {
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {
                var videos = jQuery('.video-wrapper');
                if (videos.length < 1) {
                    var message = "This Vimeo page does not contain videos accessible to the bookmarklet. Try clicking into a single video page.";
                    alert(message);
                    callback([]); // no items found
                } else {
                    // parse vimeo id out of the fallback url
                    var video = videos[0];                
                    var parent = jQuery(video).parents("div.player")[0];
                    var url = jQuery(parent).attr("data-fallback-url");
                    var vimeoId = url.split("/")[4];
                    
                    SherdBookmarklet.assethandler.objects_and_embeds.players
                    .moogaloop.asset(video, 
                                     vimeoId,
                                     {'window':window,'document':document},
                                     0,
                                     function(ind,rv){ callback([rv]); });
                }
            }); //end run_with_jquery for vimeo.com
        },
        decorate:function(objs) {
        }
    },
    "youtube.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {
                var video = document.getElementById("movie_player");
                if (video && video !== null) {
                    var v_match = video.getAttribute('flashvars');
                    if(v_match && v_match.split('cbr=')[1].match('IE&') !==null ){
                      // this is an IE embed then
                      window.IEVideo = video;
                      jQuery(video).css('display','none');
                    }
                    if (v_match) {
                        v_match = v_match.match(/video_id=([^&]*)/);
                    } else { //mostly for <OBJECT>
                        v_match = document.location.search.match(/[?&]v=([^&]*)/);
                    }
                    if(v_match===null && SherdBookmarklet.getURLParameters('v')){
                      var vid = SherdBookmarklet.getURLParameters('v');
                      v_match = ['video_id=' + vid, vid];
                    }

                    SherdBookmarklet.assethandler.objects_and_embeds.players
                    .youtube.asset(video, 
                                   v_match,
                                   {'window':window,'document':document},0,
                                   function(ind,rv){ callback([rv]); });
                } else if (document.getElementsByTagName("video").length > 0) {
                    video = document.getElementsByTagName("video")[0];
                    var videoId = jQuery(video).attr("data-youtube-id");
                    var faux_match = [null, videoId];
                    SherdBookmarklet.assethandler.objects_and_embeds.players
                    .youtube.asset(video, 
                                   faux_match,
                                   {'window':window,'document':document},0,
                                   function(ind,rv){ callback([rv]); });
                } else {
                    callback([]);
                }
            });//end run_with_jquery for youtube.com
        },
        decorate:function(objs) {
        }
    }
  },/*end hosthandler*/
  "assethandler":{
      /* assumes jQuery is available */
      "objects_and_embeds": {
          players:{
              "realplayer":{
                  /*NOTE: realplayer plugin works in non-IE only WITH <embed>
                          whereas in IE it only works with <object>
                          efforts to GetPosition() need to take this into consideration
                   */
                  match:function(eo) {
                      return (('object'==eo.tagName.toLowerCase())?
															(eo.classid=="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA"&&'obj')||null:
															(String(eo.type) == 'audio/x-pn-realaudio-plugin' && 'emb') || null );
                  },
                  asset:function(emb,match,context,index,optional_callback) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var abs = SherdBookmarklet.absolute_url;
                      var rv = {
                          html:emb,
                          primary_type:"realplayer",
                          sources: {}
                      };
                      if (match=='emb') {
                          rv.sources.realplayer = abs(emb.src, context.document);
                      } else if (match=='obj') {
                          var src = jQ('param[name=src],param[name=SRC]',emb);
                          if (src.length) {
                              rv.sources.realplayer = abs(src.get(0).value, context.document);
                          } else {
                              return rv;//FAIL
                          }
                      }

                      if (typeof emb.DoPlay != 'undefined') {
                          rv.sources["realplayer-metadata"] = "w"+(
                              emb.GetClipWidth() || emb.offsetWidth
                          )+"h"+(emb.GetClipHeight() || emb.offsetHeight);

                          rv.sources.title = emb.GetTitle() || undefined;
                          if (rv.sources.title) {//let's try for the rest
                              rv.metadata = {
                                  "author":[ emb.GetAuthor() || undefined],
                                  "copyright":[ emb.GetCopyright() || undefined]
                              };
                          }
                      } else {
                          rv.sources["realplayer-metadata"] = "w"+emb.width+"h"+emb.height;
                      }
                      
                      return rv;
                  }
              },/*end realplayer embeds*/
              "youtube":{
                  match:function(emb) {
                      ///ONLY <EMBED>
                      return String(emb.src).match(/^http:\/\/www.youtube.com\/v\/([\w\-]*)/); 
                  },
                  asset:function(emb,match,context,index,optional_callback) {
                      var apikey = SherdBookmarklet.options.youtube_apikey;

                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );                        
                      var VIDEO_ID = match[1]; //e.g. "LPHEvaNjdhw";
                      var rv = {
                          html: emb,
                          wait: true,
                          primary_type: "youtube",
                          label: "youtube video",
                          sources: {
                              "youtube": "http://www.youtube.com/v/"+VIDEO_ID+"?enablejsapi=1&fs=1",
                              "gapi": 'https://www.googleapis.com/youtube/v3/videos?id=' + VIDEO_ID
                          }};
                      if (emb.getCurrentTime) {
                          if (emb.getCurrentTime() > 0 && emb.getCurrentTime() < emb.getDuration()) 
                              rv.hash="start="+emb.getCurrentTime();
                      }
                      var yt_callback = 'sherd_youtube_callback_'+index;
                      window[yt_callback] = function(yt_data) {
                          if (yt_data.items.length > 0) {
                              var item = yt_data.items[0].snippet;
                              rv.sources.title = item.title;
                              
                              var th = item.thumbnails.default;
                              rv.sources.thumb = th.url;
                              rv.sources['thumb-metadata'] = "w"+th.width+"h"+th.height;

                              rv.metadata = {
                                  'Description': [item.description],
                                  'Channel': [item.channelTitle],
                                  'Published': [item.publishedAt]
                              };
                              rv.disabled = ! yt_data.items[0].status.embeddable;
                          }
                          optional_callback(index, rv);
                      };
                      var ajax_options = {
                          url: rv.sources.gapi + '&key=' + apikey + '&part=snippet,status&callback=' + yt_callback,
                          dataType: 'script',
                          error:function(){optional_callback(index);}
                      };
                      if (SherdBookmarklet.options.cross_origin) {
                          ajax_options.dataType = 'json';
                          ajax_options.success = window[yt_callback];
                          ajax_options.url = rv.sources.gdata+'?v=2&alt=json';
                      }
                      jQ.ajax(ajax_options);
                      // YT is declaring maximum z-index for Safari and it cannot e overriden via CSS
                      // we need to redeclare it
                      jQ('#masthead-positioner').css('z-index','999');
                      return rv;
                  }
              },/*end youtube embeds*/
              "jwplayer5":{
                  match:function(obj) {
                      return ((typeof obj.getPlaylist==='function' && typeof obj.sendEvent==='function') || null);
                  },
                  asset:function(obj,match,context) {
                      var item, pl = obj.getPlaylist();
                      switch (pl.length) {
                      case 0: return {};
                      case 1: item = pl[0]; break;
                      default:
                          //or should we just show all options?
                          if (obj.jwGetPlaylistIndex) {
                              item = pl[obj.jwGetPlaylistIndex()];
                          } else {
                              return {};
                          }
                      }
                      var rv = {"html":obj,"primary_type":'video',"sources":{}},
                          c = obj.getConfig(), 
                          pcfg = obj.getPluginConfig('http');
                      if (item.type == 'rtmp') {
                         // ensure that mp4 rtmp files contain the
                         // needed mp4: prefix so that they will play
                         // properly in flowplayer;
                         // JW Player allows you to omit this prefix,
                         // but Flowplayer does not
                         //
                         // if item.file ends with mp4,
                         // and item.file does not already begin with mp4:,
                         // then append mp4: to item.file
                         if ( (/mp4$/.test(item.file)) &&
                              !(/^mp4:/.test(item.file)) ) {
                            item.file = 'mp4:' + item.file;
                         }

                          rv.sources.video_rtmp = item.streamer+'//'+item.file;
                          rv.primary_type = "video_rtmp";
                      } else {
                          var url = item.streamer+item.file;
                          if (pcfg.startparam) {
                              rv.primary_type = "video_pseudo";
                              url += '?'+pcfg.startparam+'=${start}';
                          }
                          rv.sources[rv.primary_type] = url;
                      }
                      rv.sources[rv.primary_type+'-metadata'] = "w"+c.width+"h"+c.height;
                      if (item.image) {
                          rv.sources.thumb = SherdBookmarklet.absolute_url(item.image,
                                                                              context.document);
                      }
                      if (item.title) {
                          rv.sources.title = item.title;
                      } else rv.sources.title = document.title;
                      return rv;
                  }
              },
              "flowplayer3":{
                  match:function(obj) {
                      if (obj.data) {
                          return String(obj.data).match(/flowplayer[\.\-\w]+3[.\d]+\.swf/);
                      } else {//IE7 ?+
                          var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                          var movie = SherdBookmarklet.find_by_attr(jQ,'param','name','movie',obj);
                          return ((movie.length)?String(movie.get(0).value).match(/flowplayer-3[\.\d]+\.swf/):null);
                      }
                  },
                  asset:function(obj,match,context) {
                      /* TODO: 1. support audio
                       */
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var $f = (context.window.$f && context.window.$f(obj.parentNode));

                      var cfg = (($f)? $f.getConfig() 
                                 :jQ.parseJSON(jQ('param[name=flashvars]').get(0)
                                               .value.substr(7)));//config=
                      //getClip() works if someone's already clicked Play
                      var clip = ($f && $f.getClip() ) || cfg.clip || cfg.playlist[0];
                      var time = ($f && $f.getTime() ) || 0;
                      return this.queryasset(context,obj,cfg,clip,time, ($f && $f.id() || undefined) );
                  },
                  queryasset:function(context,obj,cfg,clip,time,ref_id) {
                      var sources = {};
                      var type = 'video';
                      var abs = SherdBookmarklet.absolute_url;
                      if (cfg.playlist && ( !clip.url || cfg.playlist.length > 1)) {
                          for (var i=0;i<cfg.playlist.length;i++) {
                              var p = cfg.playlist[i];
                              var url =  abs( ((typeof p=='string') ? p : p.url),
                                  context.document,p.baseUrl);
                              if (/\.(jpg|jpeg|png|gif)/.test(url)) {
                                  //redundant urls wasteful, but useful
                                  sources.thumb = url;
                                  sources.poster = url;
                                  continue;
                              } 
                              else if (!clip.type || clip.type == 'image') {
                                  if (/\.flv$/.test(url)) {
                                      clip = p;
                                      type = 'flv';
                                      break;
                                  } else if (/\.mp4$/.test(url)) {
                                      clip = p;
                                      type = 'mp4';
                                      break;
                                  }
                              }
                          }
                      }
                      var provider = (clip.provider && cfg.plugins[clip.provider]) || false;
                      function get_provider(c) {
                          if (provider) {
                              var plugin = provider.url;
                              if (/pseudostreaming/.test(plugin)) {
                                  return '_pseudo';
                              } else if (/rtmp/.test(plugin)) {
                                  return '_rtmp';
                              }
                          } 
                          return '';
                      }
                      var primary_type = type+get_provider(clip);
                      sources[primary_type] = clip.completeUrl || clip.originalUrl || clip.resolvedUrl || clip.url || clip;
                      if (provider && provider.netConnectionUrl) {
                          sources[primary_type] = provider.netConnectionUrl+sources[primary_type];
                      } 
                      ///TODO:is context.document the right relative URL instead of the SWF?
                      sources[primary_type] = abs(sources[primary_type],context.document);
                      if (/_pseudo/.test(primary_type) && cfg.plugins[clip.provider].queryString) {
                          sources[primary_type] += unescape(cfg.plugins[clip.provider].queryString);
                      }
                      if (clip.width && clip.width >= obj.offsetWidth) {
                          sources[primary_type+"-metadata"] = "w"+clip.width+"h"+clip.height;
                      } else {
                          sources[primary_type+"-metadata"] = "w"+obj.offsetWidth+"h"+(obj.offsetHeight-25);
                      }
                      
                      var meta_obj = SherdBookmarklet.flowclipMetaSearch(document);
                        for(var k in meta_obj){
                          sources[k] = meta_obj[k];
                      }
                      if(!sources.thumb){
                        var paramConfig = jQuery('*[name=flashvars]')[0].value.split('config=')[1];
                        eval('var paramObj='+paramConfig);
                        paramThumb = paramObj.canvas.background.split('url(')[1].split(')')[0];
                        sources.thumb = paramThumb;
                      }
                      return {
                          "html":obj,
                          "sources":sources,
                          "label":"video",
                          "primary_type":primary_type,
                          "hash":"start="+Math.floor(time),
                          "ref_id":ref_id //used for merging
                      };
                  }
              },/*end flowplayer3*/
              "flvplayer_progressive":{///used at web.mit.edu/shakespeare/asia/
                  match:function(emb) {
                      ///ONLY <EMBED>
                      return String(emb.src).match(/FLVPlayer_Progressive\.swf/);
                  },
                  asset:function(emb,match,context) {
                      var abs = SherdBookmarklet.absolute_url;
                      var flashvars = emb.getAttribute('flashvars');
                      if (flashvars) {
                          var stream = flashvars.match(/streamName=([^&]+)/);
                          if (stream !== null) {
                              return {
                                  "html":emb,
                                  "primary_type":'flv',
                                  "sources":{
                                      'flv':abs(stream[1],context.document)+'.flv'
                                  }
                              };
                          }
                      }
                      return {};
                  }
              },/*end flvplayer_progressive*/
              "kaltura": {
                  match:function(objemb) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var movie = jQ(objemb).children('param[name=movie],param[name=MOVIE]');
    
                      // kaltura & vimeo use the same classid, apparently vimeo was built off kaltura?
                      return ((objemb.classid=="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" && movie.val().search('kaltura') > -1)||
                              (String(objemb.type).search('x-shockwave-flash') > -1 &&
                               ((objemb.data && String(objemb.data).search('kaltura') > -1) ||
                                (objemb.src && String(objemb.src).search('kaltura') > -1) ||
                                (objemb.resource && String(objemb.resource).search('kaltura') > -1)))) || null;
                  },
                  asset:function(objemb,match_rv,context,index,optional_callback) {
                      var stream = objemb.data || objemb.src;
                      if (!stream) {
                          var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                          var movie = jQ(objemb).children('param[name=movie],param[name=MOVIE]');
                          stream = movie.val();
                       }

                       if (!stream) {
                          return {};
											 }
                       var rv = {
                          html:objemb,
                          primary_type:"kaltura",
                          label:"kaltura video",
                          sources: {
                              "kaltura": stream
                          }};
                      
                      
                      if (objemb.evaluate) {
                          var currentTime = objemb.evaluate("{video.player.currentTime}");
                          if (currentTime !== undefined && currentTime > 0)
                              rv.hash="start="+ currentTime; 
                          
                          var entry = objemb.evaluate('{mediaProxy.entry}');
                          rv.sources.title = entry.name;
                          rv.sources.thumb = entry.thumbnailUrl;
                          rv.sources["metadata-owner"] = entry.userId || undefined;
                          rv.sources.width = entry.width;
                          rv.sources.height = entry.height;
                          rv.sources.downloadUrl = entry.downloadUrl;
                      }
                      
                      return rv;
                  }                     
              },
              "quicktime":{
                  match:function(objemb) {
                      return (objemb.classid=="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" ||
															String(objemb.type).match(/quicktime/) !== null ||
															String(objemb.src).match(/\.(mov|m4v)$/) !== null
                             ) || null;
                  },
                  asset:function(objemb,match,context) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var abs = SherdBookmarklet.absolute_url;
                      var src = objemb.src || jQ(objemb).children('param[name=src],param[name=SRC]');
                      if (src.length) {
                          src = (src.get) ? src.get(0).value : src;
                          return {
                              "html":objemb,
                              "primary_type":'quicktime',
                              "sources":{
                                  "quicktime":abs(src, context.document),
                                  "quicktime-metadata":"w"+objemb.offsetWidth+"h"+objemb.offsetHeight
                              }
                          };
                      } else {
                          return {};
                      }
                  }                  
              },
              "moogaloop": {
                  match:function(objemb) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery || window.jQuery);
                      var movie = jQ(objemb).children('param[name=movie],param[name=MOVIE]');

                      return ((objemb.classid=="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" && movie.val().search('moogaloop') > -1) ||
                              (String(objemb.type).search('x-shockwave-flash') > -1 && 
                               ((objemb.data && String(objemb.data).search('moogaloop.swf')) > -1 || 
                                (objemb.src && String(objemb.src).search('moogaloop.swf') > -1)))) || null;
                  },
                  asset:function(objemb,match_rv,context,index,optional_callback) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery || window.jQuery);
                      
                      var vimeoId;
                      if (match_rv) {
                          vimeoId = match_rv;
                      } else {
                          var matches = objemb.src && objemb.src.match(/clip_id=([\d]*)/);
                          if (!matches || matches.length < 1) {
                              var flashvars = jQ(objemb).children('param[name=flashvars],param[name=FLASHVARS]');
                              if (!flashvars.val()) {
                                  return {};
                              }
                              matches = flashvars.val().match(/clip_id=([\d]*)/);
                          }
                          if (!matches || matches.length < 2) {
                              return {};
                          }
                          vimeoId = matches[1];
                      }
                      
                      var rv = {
                          html:objemb,
                          wait:true,
                          primary_type:"vimeo",
                          label:"vimeo video",
                          sources: {
                              "url": "http://www.vimeo.com/" + vimeoId,
                              "vimeo":"http://www.vimeo.com/" + vimeoId
                          }};
                          
                      if (objemb.api_getCurrentTime) {
                          if (objemb.api_getCurrentTime() > 0) {
                              rv.hash="start="+ objemb.api_getCurrentTime();
                          }
                      }
                          
                      var vm_callback = 'sherd_vimeo_callback_'+ index;
                      window[vm_callback] = function(vm_data) {
                          if (vm_data && vm_data.length > 0) {
                              var info = vm_data[0];
                              rv.sources.title = info.title;
                              rv.sources.thumb = info.thumbnail_medium;
                              rv.sources["metadata-owner"] = info.user_name ||undefined;
                              rv.sources.width = info.width;
                              rv.sources.height = info.height;
                          }
                          optional_callback(index,rv);
                      };
                      var ajax_options = {
                          url: "https://www.vimeo.com/api/v2/video/" + vimeoId + ".json?callback=" + vm_callback,
                          dataType: 'script',
                          error:function(){optional_callback(index);}
                      };
                      if (SherdBookmarklet.options.cross_origin) {
                          ajax_options.dataType = 'json';
                          ajax_options.success = window[vm_callback];
                          ajax_options.url = "https://www.vimeo.com/api/v2/video/" + vimeoId + ".json";
                      }
                      jQ.ajax(ajax_options);
                      return rv;
                  }                     
              },
              "zoomify":{
                  match:function(objemb) {
                      return (String(objemb.innerHTML).match(/zoomifyImagePath=([^&\"\']*)/) || String(objemb.flashvars).match(/zoomifyImagePath=([^&\"\']*)/));
                  },
                  asset:function(objemb,match,context,index,optional_callback) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var tile_root = SherdBookmarklet.absolute_url(match[1],context.document);
                      tile_root = tile_root.replace(/\/$/,'');//chomp trailing /
                      var img = document.createElement("img");
                      img.src = tile_root+"/TileGroup0/0-0-0.jpg";
                      var rv_zoomify = {
                          "html":objemb,
                          "primary_type":"image",
                          "label":"Zoomify",
                          "sources": {
                              "title":tile_root.split('/').pop(),//better guess than 0-0-0.jpg
                              "xyztile":tile_root + "/TileGroup0/${z}-${x}-${y}.jpg",
                              "thumb":img.src,
                              "image":img.src, /*nothing bigger available*/
                              "image-metadata":"w"+img.width+"h"+img.height
                          },
                          wait:true
                      };
                      var hard_way = function(error) {
                          //security error?  
                          //Let's try it the hard way!
                          var dim = {z:0,x:0,y:0,tilegrp:0};
                          function walktiles(mode) {
                              var tile = document.createElement("img");
                              tile.onload = function() {
                                  switch(mode) {
                                  case 'z': ++dim.z;
                                      dim.width = tile.width;
                                      dim.height = tile.height;
                                      break;
                                  case 'x': ++dim.x; break;
                                  case 'y': ++dim.y; break;
                                  case 'tilegrp': ++dim.tilegrp; break;
                                  }
                                  walktiles(mode);
                              };
                              tile.onerror = function() {
                                  switch(mode) {
                                  case 'z': --dim.z; dim.mode = 'x'; return walktiles('x');
                                  case 'x': --dim.x; dim.mode = 'y'; return walktiles('y');
                                  case 'y': 
                                      if (dim.mode!='tilegrp'){
                                          ++dim.tilegrp; dim.mode='y'; return walktiles('tilegrp');
                                      } else {
                                          --dim.y; 
                                          rv_zoomify.sources["xyztile-metadata"] = (
                                              "w"+(dim.width*dim.x)+"h"+(dim.height*dim.y));
                                          rv_zoomify._data_collection = 'Hackish tile walk';
                                          return optional_callback(index,rv_zoomify);
                                      }
                                  case 'tilegrp': --dim.tilegrp;
                                      var m = dim.mode; dim.mode = 'tilegrp'; 
                                      return walktiles(m);
                                  }
                              };
                              tile.src = tile_root+'/TileGroup'+dim.tilegrp+'/'+dim.z+'-'+dim.x+'-'+dim.y+'.jpg';
                          }
                          walktiles('z');
                      };
                      try {
                          jQuery.ajax({
                              url:tile_root+"/ImageProperties.xml",
                              dataType:'text',
                              success:function(dir) {
                                  /*was for url = tile_root+"/TileGroup0/" parsing:
                                 var zooms = dir.split("\">").reverse()[3].match(/\d+/);
                                 var exp = Math.pow(2,zooms);
                                 sources["xyztile-metadata"] = "w"+(img.width*exp)+"h"+(img.height*exp);
                                */
                                  var sizes = dir.match(/WIDTH=\"(\d+)\"\s+HEIGHT=\"(\d+)\"/);
                                  rv_zoomify.sources["xyztile-metadata"] = "w"+(sizes[1])+"h"+(sizes[2]);
                                  rv_zoomify._data_collection = 'ImageProperties.xml';
                                  optional_callback(index,rv_zoomify);
                              },
                              error:hard_way
                          });
                      } catch(ie_security_error) {
                          hard_way();
                      }
                      return rv_zoomify;
                  }
              }
          },
          find:function(callback,context) {
              var self = this;
              var result = [];
              var waiting = 0;
              var finished = function(index, asset_result) {
                  result[index] = asset_result || result[index];
                  if (--waiting <= 0) { callback(result); }
              };
              function matchNsniff(oe) {
                  for (var p in self.players) {
                      var m = self.players[p].match(oe);
                      if (m !== null) {
                          var res = self.players[p].asset(oe, m, context, result.length, finished);
                          if (res.sources)
                              result.push(res);
                          if (res.wait) {
                              ++waiting;
                          }
                          break;
                      }
                  }
              }
              var embs = context.document.getElementsByTagName("embed");
              var objs = context.document.getElementsByTagName("object");
              for (var i=0;i<embs.length;i++) {
                  matchNsniff(embs[i]);
							}
              for (i=0;i<objs.length;i++) {
                  matchNsniff(objs[i]);
							}
              if (waiting===0) {
                  callback(result);
							}
          }
      },/* end objects assethandler */
      "video_tag": {
          find:function(callback,context) {
              var videos = context.document.getElementsByTagName("video");
              var result = [];
              var codecs = /[.\/](ogv|ogg|webm|mp4)/i;
              var addSource = function(source,rv,video) {
                  if (!source.src) return;
                  var vid_type = 'video';
                  var mtype = String(video.type).match(codecs);
                  if (mtype) {
                      vid_type = mtype[1].toLowerCase();
                      if (video.canPlayType(video.type)=="probably")
                          rv.primary_type = vid_type;
                  } else if (mtype == String(source.src).match(codecs)) {
                      vid_type = mtype[1].toLowerCase().replace('ogv','ogg');
                  }
                  if (rv.primary_type == 'video')
                      rv.primary_type = vid_type;
                  rv.sources[vid_type] = source.src;
                  rv.sources[vid_type+'-metadata'] = "w"+video.videoWidth+"h"+video.videoHeight;
              };
              for (var i=0;i<videos.length;i++) {
                  var rv = {
                      "html":videos[i],
                      "label": "video",
                      "primary_type":"video",
                      "sources": {}
                  };
                  if (videos[i].poster) {
                      rv.sources.poster = videos[i].poster;
                  }
                  addSource(videos[i], rv, videos[i]);
                  var sources = videos[i].getElementsByTagName('source');
                  for (var j=0;j<sources.length;j++) {
                      addSource(sources[j], rv, videos[i]);
                  }
                  result.push(rv);
              }
              callback(result);
          }
      },/* end image assethandler */
      "audio": {
          find:function(callback,context) {
            if(!jQuery){
              jQuery = window.SherdBookmarkletOptions.jQuery;
            }
            // test if we are on the asset itself, relying on
            // the browser (support) handling the mp3 file
            if (/.mp3$/.test(document.location)) {
                callback([{
                    "html":document.documentElement,
                    "primary_type":"mp3",
                    "sources": {
                        "mp3": String(document.location)
                    }
                }]);
            }else{//this must be a listing of audio files somewhere 
                  // on the page.
                window.SherdBookmarklet.snd_asset_2_django = function(mp3, type){
                  mp3.each(function(i){
                  callback([{
                      "html":document.documentElement,
                      "primary_type":"mp3",
                      "sources": {
                        "mp3": mp3[i][type]
                      }
                  }]);
                });
                };
              var mp3, type;
              if(jQuery('*[href$="mp3"]').length){// check for href
                mp3 = jQuery('*[href$="mp3"]');
                type = 'href';
              }else if(jQuery('*[src$="mp3"]').length){// check for src
                mp3 = jQuery('*[src$="mp3"]');
                type = 'src';
              }//end else if
              if (mp3 !== undefined){
                window.SherdBookmarklet.snd_asset_2_django(mp3, type);
              }//end if
            }//end else
          }//end find
      },
      "iframe.postMessage":{
          find:function(callback,context) {
              if (!window.postMessage) return callback([]);
              var frms = context.document.getElementsByTagName("iframe");
              var result = [];
              var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
              SherdBookmarklet.connect(context.window,'message',function(evt) {
                  try {
                      var id, d = jQ.parseJSON(evt.data);
                      if ((id = String(d.id).match(/^sherd(\d+)/)) && d.info) {
                          var i = d.info;
                          switch(i.player) {
                          case "flowplayer":
                              var fp = (SherdBookmarklet.assethandler.objects_and_embeds.players
                                        .flowplayer3.queryasset(context,frms[parseInt(id[1],10)],i.config, i.clip, i.time, i.id));
                              return callback([fp]);
                          default:
                              return callback([]);
                          }
                      }
                  } catch(e) {/*parse error*/}
              });
              for (var i=0;i<frms.length;i++) {
                  try {
                      frms[i].contentWindow.postMessage('{"event":"info","id":"sherd'+i+'"}','*');
                  } catch(e) {/*pass: probably security error*/}
              }              
          }
      },
      "iframe.youtube": {
          find:function(callback, context) {
              var frms = context.document.getElementsByTagName("iframe");
              var result = [];
              var jQ = (window.SherdBookmarkletOptions.jQuery || window.jQuery);
              for (var i = 0; i < frms.length; i++) {
                  var v_match = String(frms[i].src).match(/^http:\/\/www.youtube.com\/embed\/([\w\-]*)/);
                  if (v_match && v_match.length > 1) {
                      SherdBookmarklet.assethandler.objects_and_embeds.players
                      .youtube.asset(frms[i],
                                     v_match,
                                     {'window': window,
                                      'document': document}, 0,
                                     function(ind, rv){ callback([rv]); });
                  }
              }
          }          
      },      
      "image": {
          find:function(callback,context) {
              var imgs = context.document.getElementsByTagName("img");
              var result = [];
              var zoomify_urls = {};
              var done = 0;
              var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
              for (var i=0;i<imgs.length;i++) {
                  //IGNORE headers/footers/logos
                  var image = imgs[i];
                  if (/(footer|header)/.test(image.className)||
											//WGBH header
											/site_title/.test(image.parentNode.parentNode.className)||
											//drupal logo
											/logo/.test(image.id)||
											//drupal7 logo
											/logo/.test(image.parentNode.id)||
											//web.mit.edu/shakespeare/asia/
											/logo\W/.test(image.src)
                     ) continue;
                  if (image.src.length > 4096 || image.src.indexOf('data') === 0)
                      continue;
                  /*recreate the <img> so we get the real width/height */
                  var image_ind = document.createElement("img");
                  image_ind.src = image.src;
                  if (image_ind.width === 0) {
                      //for if it doesn't load immediately
                      //cheating: TODO - jQ(image_ind).bind('load',function() { /*see dropbox.com above*/ });
                      image_ind = image;
                  }
                  if (image_ind.width >= 400 || image_ind.height >= 400) {
                      result.push({
                          "html":image,
                          "primary_type":"image",
                          "sources": {
                              "title":image.title || undefined,
                              "image":image.src,
                              "image-metadata":"w"+image_ind.width+"h"+image_ind.height
                          }
                      });
                  } else {
                      ////Zoomify Tile Images support
                      var zoomify_match = String(image.src).match(/^(.*)\/TileGroup\d\//);
                      if (zoomify_match) {
                          var tile_root = SherdBookmarklet.absolute_url(zoomify_match[1],context.document);
                          if (tile_root in zoomify_urls)
                              continue;
                          else {
                              zoomify_urls[tile_root] = 1;
                              var img = document.createElement("img");
                              img.src = tile_root+"/TileGroup0/0-0-0.jpg";
                              var zoomify = {
                                  "html":image,
                                  "primary_type":"image",
                                  "sources": {
                                      "title":tile_root.split('/').pop(),//better guess than 0-0-0.jpg
                                      "xyztile":tile_root + "/TileGroup0/${z}-${x}-${y}.jpg",
                                      "thumb":img.src,
                                      "image":img.src, /*nothing bigger available*/
                                      "image-metadata":"w"+img.width+"h"+img.height
                                  }
                              };
                              result.push(zoomify);
                              done++;
                              /*Get width/height from zoomify's XML file
                                img_root+"/source/"+img_key+"/"+img_key+"/ImageProperties.xml"
                               */
                              jQ.get(tile_root+"/ImageProperties.xml",null,function(dir) {
                                  var sizes = dir.match(/WIDTH=\"(\d+)\"\s+HEIGHT=\"(\d+)\"/);
                                  zoomify.sources["xyztile-metadata"] = "w"+(sizes[1])+"h"+(sizes[2]);
                                  if (--done===0) callback(result);
                              },"text");
                          }
                      }
                  }
              }
              for (i=0;i<result.length;i++) {
                  SherdBookmarklet.metadataSearch(result[i], context.document);
              }
              if (done===0) callback(result);
          }
      },/* end image assethandler */
      "mediathread": {
          ///the better we get on more generic things, the more redundant this will be
          ///BUT it might have more metadata
          find:function(callback) {
              var result = [];
              var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
              jQ('div.asset-links').each(function(){
                  var top = this;
                  var res0 = {html:top, sources:{}};
                  jQ('a.assetsource',top).each(function() {
                      var reg = String(this.getAttribute("class")).match(/assetlabel-(\w+)/);
                      if (reg !== null) {
                          ///use getAttribute rather than href, to avoid urlencodings
                          res0.sources[reg[1]] = this.getAttribute("href");
                          if (/asset-primary/.test(this.className))
                              res0.primary_type = reg[1];
                          if (this.title) 
                              res0.sources.title = this.title;
                      }
                  });
                  result.push(res0);
              });
              return callback(result);
          }
      },/* end mediathread assethandler */
      "unAPI": {/// http://unapi.info/specs/
          page_resource:true,
          find:function(callback,context) {
              var self = this;
              var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
              var unapi = jQ('abbr.unapi-id');
              ///must find one, or it's not a page resource, and we won't know what asset to connect to
              if (unapi.length == 1) {
                  var server = false;
                  jQ("link").each(function(){if (this.rel=='unapi-server') server = this.href;});
                  if (server) {
                      ///start out only supporting pbcore
                      var format = '?format=pbcore';
                      var request_url = server+format+'&id='+unapi.attr('title');
                      jQ.ajax({
                          "url":request_url,
                          "dataType":"text",
                          success:function(pbcore_xml,textStatus,xhr) {
                              var rv = {
                                  "page_resource":true,
                                  "html":unapi.get(0),
                                  "primary_type":"pbcore",
                                  "sources":{
                                      'pbcore':request_url
                                  },
                                  "metadata":{'subject':[]}
                              };
                              var pb = SherdBookmarklet.xml2dom(pbcore_xml,xhr);
                              if (! jQ('PBCoreDescriptionDocument',pb).length) {
                                  return callback([]);
                              }
                              jQ('title',pb).each(function() {
                                  var titleType = jQ('titleType',this.parentNode).text();
                                  if (titleType == 'Element' || document.title.indexOf(this.firstChild.data) > -1
                                     ) {
                                      rv.sources.title = this.firstChild.data;
                                  } else {
                                      rv.metadata[titleType+':Title'] = [this.firstChild.data];
                                  }
                              });
                              jQ('description',pb).each(function() {
                                  rv.metadata.description = [this.firstChild.data];
                              });
                              jQ('contributor',pb).each(function() {
                                  var role = jQ('contributorRole',this.parentNode).text();
                                  rv.metadata['Contributor:'+role] = [this.firstChild.data];
                              });
                              jQ('coverage',pb).each(function() {
                                  var type = jQ('coverageType',this.parentNode).text();
                                  rv.metadata['Coverage:'+type] = [this.firstChild.data];
                              });
                              jQ('rightsSummary',pb).each(function() {
                                  rv.metadata.Copyrights = [this.firstChild.data];
                              });
                              jQ('subject',pb).each(function() {
                                  ///TODO: should we care about the subjectAuthorityUsed?
                                  rv.metadata.subject.push(this.firstChild.data);
                              });
                              jQ('publisher',pb).each(function() {
                                  rv.metadata.publisher = [this.firstChild.data];
                              });
                              ///TODO: should we get video metadata (betacam, aspect ratio)?
                              callback([rv]);
                          },
                          error:function(){
                            //attempt to scrape manually
                            if(console){
                              console.log('trying to scrape manually, something went wrong with the unAPI call');
                              // if Openvault
                              if(request_url.indexOf('openvault')>0){
                                var rv = {
                                  "page_resource":true,
                                  "html":document,
                                  "primary_type":"pbcore",
                                  "sources":{
                                      'pbcore':window.location.href
                                  },
                                  "metadata":{'subject':[]}
                                  };
                                  rv.metadata.Description = [jQ('.blacklight-dc_description_t .value').text()];
                                  rv.metadata.Subject = [jQ('.blacklight-topic_cv .value').text()];
                                  rv.metadata.Copyrights = [jQ('.copyright').text()];
                                  rv.metadata.Publisher = ['WGBH Educational Foundation'];
                              }
                            }
                            if(rv){
                              callback([rv]);
                            }else{
                              callback([]);
                            }
                          }
                      });
                      return;
                  }//end if (server)
              }//end if (unapi.length)
              return callback([]);
          }
      },/* end unAPI assethandler */
      "oEmbed.json": {/// http://www.oembed.com/
          page_resource:true,
          find:function(callback,context) {
              var self = this;
              var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
              var oembed_link = false;
              jQ("link").each(function(){
                  //jQuery 1.0 compatible
                  if (this.type == 'application/json+oembed') oembed_link = this;
              });
              if (oembed_link) {
                  var result = {
                      "html":oembed_link,
                      "sources":{},
                      "metadata":{},
                      "page_resource":true
                  };
                  jQ.ajax({
                      "url":result.html.href,
                      "dataType":'json',
                      success:function(json,textStatus) {
                          if (json.ref_id) {
                              result.ref_id = json.ref_id;
                          }
                          if (json.url) {
                              switch(json.type) {
                                case "photo":
                                case "image":
                                  result.primary_type = "image";
                                  result.sources.image = json.url;
                                  ///extension: openlayers tiling protocol
                                  if (json.xyztile) {
                                      var xyz = json.xyztile;
                                      result.sources.xyztile = xyz.url;
                                      result.sources["xyztile-metadata"] = "w"+xyz.width+"h"+xyz.height;
                                  }
                                  break;
                                case "video":
                                  result.primary_type = "video";
                                  if (/\.pseudostreaming-/.test(json.html))
                                      result.primary_type = "video_pseudo";
                                  else if (/\rtmp/.test(json.html))
                                      result.primary_type = "video_rtmp";
                                  result.sources[result.primary_type] = json.url;
                                  break;
                                default:
                                  return callback([]);
                              }
                              result.sources[result.primary_type+'-metadata'] = 
                                  "w"+json.width+"h"+json.height;
                          }
                          if (json.thumbnail_url) {
                              result.sources.thumb = json.thumbnail_url;
                              result.sources["thumb-metadata"]="w"+json.thumbnail_width+"h"+json.thumbnail_height;
                          }
                          if (json.title) {
                              result.sources.title = json.title;
                          }
                          if (json.description) {
                              result.metadata.description = [json.description];
                          }
                          if (json.metadata) {//extension
                              result.metadata = json.metadata;
                          }
                          callback([result]);
                      },
                      error:function(e) {callback([]);}
                  });
              } else {
                  callback([]);
              }
          }
      }/* end oEmbed.json assethandler */
  },/*end assethandler*/
  "gethosthandler":function() {
      var hosthandler = SherdBookmarklet.hosthandler;
      hosthandler['mcah.columbia.edu'] = hosthandler['learn.columbia.edu'];
      for (var host in hosthandler) {
          if (new RegExp(host+'$').test(location.hostname.replace('.ezproxy.cul.columbia.edu',''))) 
              return hosthandler[host];
      }
  },/*gethosthandler*/
  "obj2url": function(host_url,obj) {
    /*excluding metadata because too short for GET string*/
    if (!obj.sources.url) obj.sources.url = String(document.location);
    var destination =  host_url;
    for (var a in obj.sources) {
        if (typeof obj.sources[a] =="undefined") continue;
  destination += ( a+"="+escape(obj.sources[a]) +"&" );
    }
    if (obj.hash) {
        destination += "#"+obj.hash;
    }
    return destination;
  },/*obj2url*/
  "obj2form": function(host_url,obj,doc,target, index) {
      var M = window.SherdBookmarklet;
      doc = doc||document;
      target = target||'_top';
      ///if more than one asset, we should try to prefix this to keep url= unique
      if (!obj.sources.url) obj.sources.url = String(doc.location)+ (index ? '#'+obj.sources[obj.primary_type].split('#')[0].split('/').pop() : '');
      var destination =  host_url;
      if (obj.hash) {
          destination += "#"+obj.hash;
      }
      var form = M.elt(doc,'form','',{},[
          M.elt(doc,'div','sherd-asset-wrap',{})
      ]); 
      form.action = destination;
      form.target = target;
      var ready = M.user_ready();
      form.method = (ready) ? 'POST' : 'GET'; 

      var form_api = M.options.form_api || 'mediathread';
      M.forms[form_api](obj,form,ready,doc);
      return form;
  },/*obj2form*/
  "addField": function(name,value,form,doc) {
    var span = doc.createElement("span");
    var item = doc.createElement("input");
    if (name=="title") {
      item.type = "text";
      //IE7 doesn't allow setAttribute here, mysteriously
      item.className = "sherd-form-title";
    } else {
      item.type = "hidden";
    }
    item.name = name;
    ///Ffox bug: this must go after item.type=hidden or not set correctly
    item.value = value;
    //form.appendChild(span);
    form.appendChild(item);
    return item;
  },/*addField*/
  "forms": {
    "mediathread": function(obj,form,ready,doc) {
      var M = window.SherdBookmarklet;
      /* just auto-save immediately
       * this also allows us to send larger amounts of metadata
       */
      for (var a in obj.sources) {
          if (typeof obj.sources[a] =="undefined") continue;
          M.addField(a, obj.sources[a],form,doc);
      }
      if (!obj.sources.title) {
          //guess title as file-name
          M.addField('title', obj.sources[obj.primary_type].split('/').pop().split('?').shift(),form,doc);
      }
      if (ready && obj.metadata) {
          for (a in obj.metadata) {
              for (var i=0;i<obj.metadata[a].length;i++) {
                  M.addField("metadata-"+a, obj.metadata[a][i],form,doc);
              }
          }
      }
      M.addField("asset-source", "bookmarklet",form,doc);
    },/*mediathread_form*/
    "imagemat":function(obj,form,ready,doc) {
      var M = window.SherdBookmarklet;
      if (obj.sources.title) {
        var span = doc.createElement('span');
        span.innerHTML = obj.sources.title;
        span.className = 'sherdjs-source-title';
        form.appendChild(span);
        M.addField('ftitle',obj.sources.title,form,doc);      
      }
      M.addField('htmls[0]',obj.sources.url,form,doc);
      M.addField('urls[0]',obj.sources[obj.primary_type],form,doc);
      M.addField('jsons[0]',
                 JSON.stringify(obj,
                                function(key,value){
                                  if (typeof value=='object' && value.tagName) {
                                    return '';
                                  } else return value;
                                }),
                 form,doc);
    }/*imagemat_form*/
  },
  "runners": {
    jump: function(host_url,jump_now) {
        var final_url = host_url;
        var M = SherdBookmarklet;
        var handler = M.gethosthandler();
        var grabber_func = function(jQuery) {
            M.g = new M.Interface(host_url);
            M.g.findAssets();
        };
        if (!handler) {
            M.run_with_jquery(grabber_func);
            return;
        }
        var jump_with_first_asset = function(assets,error) {
            if (assets.length === 0) {
                if (handler.also_find_general) {
                    M.run_with_jquery(grabber_func);
                    return;
                }
                var message = error||"This page does not contain any supported media assets. Try going to an asset page.";
                return alert(message);
            } else if (assets.length === 1 && assets[0].disabled) {
                return alert("This asset cannot be embedded on external sites. Please select another asset.");
            } else {
                M.g = new M.Interface(host_url, {'allow_save_all': handler.allow_save_all});
                M.g.showAssets(assets);
            }
        };/*end jump_with_first_asset*/
        handler.find.call(handler, jump_with_first_asset);
    },
    decorate: function(host_url) {
        var M = SherdBookmarklet;
        function go(run_func) {
            M.run_with_jquery(function() {
                M.g = new M.Interface(host_url);
                if (run_func=='onclick') M.g.findAssets();
            });
        }
        /*ffox 3.6+ and all other browsers:*/
        if (document.readyState != "complete") {
            /*future, auto-embed use-case.
              When we do this, we need to support ffox 3.5-
             */
            M.l = M.connect(window,"load",go);
        } else {/*using as bookmarklet*/
            go('onclick');
        }
    }
  },/*runners*/
  "connect":function (dom,event,func) {
      try {
          return ((dom.addEventListener)? dom.addEventListener(event,func,false) : dom.attachEvent("on"+event,func));
      } catch(e) {/*dom is null in firefox?*/}
  },/*connect*/
  "hasClass":function (elem,cls) {
      return (" " + (elem.className || elem.getAttribute("class")) + " ").indexOf(cls) > -1;
  },
  "hasBody":function(doc) {
          return (doc.body && 'body'==doc.body.tagName.toLowerCase());
  },
  "clean":function(str) {
      return str.replace(/^\s+/,'').replace(/\s+$/,'').replace(/\s+/,' ');
  },
  "getImageDimensions":function(src,callback,onerror) {
      //
      var img = document.createElement("img");
      img.onload = function() {
          callback(img,"w"+img.width+"h"+img.height);
      };
      img.onerror = onerror;
      img.src = src;
      return img;
  },
  "mergeMetadata":function(result,metadata) {
      if (!metadata) return;
      if (!result.metadata) {
          return result.metadata = metadata;
      } else {
          for (var a in metadata) {
              if (result.metadata[a]) {
                  result.metadata[a].push.apply(result.metadata[a], metadata[a]);
              } else {
                  result.metadata[a] = metadata[a];
              }
          }
      }
      return metadata;
  },
  "metadataSearch":function(result, doc) {
      /*searches for neighboring metadata in microdata and some ad-hoc microformats */
      var M = SherdBookmarklet;
      if (!M.mergeMetadata(result,M.metadataTableSearch(result.html, doc))) {
          M.mergeMetadata(result,M.microdataSearch(result.html, doc));
      }
      var meta = result.metadata;
      if (meta) {
          //move appopriate keys to result.sources
          var s = {
              "title":meta.title || meta.title,
              "thumb":meta.thumb || meta.Thumb || meta.Thumbnail || meta.thumbnail
          };
          for (var a in s) {
              if (s[a]) {
                  result.sources[a] = s[a].shift();
              }
          }
      }
  },
    "microdataSearch":function(elem, doc) {
      var item;
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
      jQ(elem).parents('*[itemscope=]').each(function(){ item = this; });
      if (item) {
          if (item.properties) {
              return item.properties;
          } else {
              var props = {};
              var abs = SherdBookmarklet.absolute_url;
              jQ('*[itemprop]',item).each(function(){
                  var p = this.getAttribute('itemprop');
                  props[p] = props[p] || [];
                  switch(String(this.tagName).toLowerCase()) {
                  case "a":case "link":case "area":
                      props[p].push(abs(this.href, doc));
                  case "audio":case "embed":case "iframe":case "img":case "source":case "video":
                      props[p].push(abs(this.src, doc));
                  default:
                      props[p].push(jQ(this).text());
                  }
              });
              return props;
          }
      }
  },
  "metadataTableSearch":function(elem, doc) {
      /*If asset is in a table and the next row has the word 'Metadata' */
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
      if ('td'===elem.parentNode.tagName.toLowerCase()) {
          var trs = jQ(elem.parentNode.parentNode).nextAll();
          if (trs.length && /metadata/i.test(jQ(trs[0]).text())) {
              var props = {};
              trs.each(function() {
                  var tds = jQ('td',this);
                  if (tds.length === 2) {
                      var p = SherdBookmarklet.clean(jQ(tds[0]).text());
                      if (p) {
                          props[p] = props[p] || [];
                          var val = SherdBookmarklet.clean(jQ(tds[1]).text());
                          //if there's an <a> tag, then use the URL -- use for thumbs
                          jQ('a',tds[1]).slice(0,1).each(function() {
                              val = SherdBookmarklet.absolute_url(this.href,doc);
                          });
                          props[p].push(val);
                      }
                  }
              });
              return props;
          }
      }
  },
  "flowclipMetaSearch": function(doc){
      if (jQuery){
        var metaData = {};
        var metaDataElms = jQuery('*[itemprop]', document);
            if (metaDataElms !== undefined){
                metaDataElms.each(function(){
                    var itemProp = jQuery(this).attr('itemprop');
                    var val = jQuery(this).text();
                    if(jQuery(this).attr('itemref')){
                        var metaId = jQuery(this).attr('itemref');
                        if(metaData['metadata-'+itemProp] === undefined ){
                            metaData['metadata-'+itemProp] = {};
                        }
                        metaListItem = jQuery("#"+metaId).text();
                        metaData['metadata-'+itemProp][metaId] = metaListItem;
                    }
                    if(itemProp === "title"){
                        metaData[itemProp] = val;
                    }else if(typeof metaData['metadata-'+itemProp] !== "object"){
                        metaData['metadata-' + itemProp] = val;
                    }
                });
                for(var data in metaData){
                    if(typeof metaData[data]== "object"){
                        var flatMetaData = '';
                        for(var str in metaData[data]){
                            if(flatMetaData === ''){
                                flatMetaData = metaData[data][str];
                            }else{
                                flatMetaData += ', '+ metaData[data][str];
                            }
                        }
                        metaData[data] = flatMetaData;
                    }// end if typeof metaData[data]
                }
                return metaData;
            }// end meta_data_elms !== undefined
      }// end if (jQuery)
  },
  "xml2dom":function (str,xhr) {
      if (window.DOMParser) {
          var p = new DOMParser();
          return p.parseFromString(str,'text/xml');
      } else if (window.ActiveXObject) {
          var xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
          xmlDoc.loadXML(str);
          return xmlDoc;
      } else {
          var div = document.createElement('div');
          div.innerHTML = str;
          return div;
      }
  },
  "find_by_attr":function (jq,tag,attr,val,par) {
      if (/^1.0/.test(jq.prototype.jquery)) {
          return jq(tag,par).filter(function(elt) {
              return (elt.getAttribute && elt.getAttribute(attr) == val);
          });
      } else {
          return jq(tag+'['+attr+'='+val+']',par);
      }
  },
  "absolute_url":function (maybe_local_url, doc, maybe_suffix) {
      maybe_local_url = (maybe_suffix || '') + maybe_local_url;
      if (/:\/\//.test(maybe_local_url)) {
          return maybe_local_url;
      } else {
          var cur_loc = doc.location.toString().split('?')[0].split('/');
          if (maybe_local_url.indexOf('/') === 0) {
              return cur_loc.splice(0,3).join('/') + maybe_local_url;
          } else {
              cur_loc.pop();///filename
              
              while (maybe_local_url.indexOf('../') === 0) {
                  cur_loc.pop();
                  maybe_local_url = maybe_local_url.substr(3);
              }
              return cur_loc.join('/') + '/' + maybe_local_url;
          }
      }
  },
  "elt":function(doc,tag,className,style,children) {
      ///we use this to be even more careful than jquery for contexts like doc.contentType='video/m4v' in firefox
      var setStyle = function(e,style) {
          //BROKEN IN IE: http://www.peterbe.com/plog/setAttribute-style-IE
          var css = style.split(';');
          for (var i=0;i<css.length;i++) {
              var kv = css[i].split(':');
              if (kv[0] && kv.length===2) {
                  e.style[kv[0].replace(/-([a-z])/,function(a,b){return b.toUpperCase();})] = kv[1];
              }
          }
      };
      var t = doc.createElement(tag);
      t.setAttribute('class',className);
      if (typeof style == 'string') {
          t.setAttribute('style',style);
          setStyle(t,style);
      } else for (var a in style) {
          t.setAttribute(a,style[a]);
          if (style[a] === null) t.removeAttribute(a);
          if (a==='style') {
              setStyle(t,style[a]);
          }
      }
      if (children) {
          for (var i=0;i<children.length;i++) {
              var c = children[i];
              if (typeof c == 'string') {
                  t.appendChild(doc.createTextNode(c));
              } else {
                  t.appendChild(c);
              }
          }
      }
      return t;
  },
  /**************
   Finder finds assets in a document (and all sub-frames)
   *************/
  "Finder" : function() {
      var self = this;
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );

      this.handler_count = 0;
      this.final_count = 0;
      this.assets_found = [];
      this.page_resource_count = 0;
      this.best_frame = null;
      this.asset_keys = {};

      this.ASYNC = {
          remove:function(asset){},
          display:function(asset,index){},
          finish:function(){},
          best_frame:function(frame){}
      };

      this.bestFrame = function() {
          return self.best_frame;
      };

      this.findAssets = function() {
          self.assets_found = [];
          var handler = SherdBookmarklet.gethosthandler();
          if (handler) {
              handler.find.call(handler, self.collectAssets);
              if (handler.also_find_general) {
                  self.findGeneralAssets();
              }
          } else {
              self.findGeneralAssets();

          }
          if(self.assets_found.length === 0 && SherdBookmarklet.user_ready()){
            self.noAssetMessage();
          }
      };
      
      this.noAssetMessage = function(){
        var closeBtn = jQ('<div class="no-asset-close-btn">X</div>');
        var messageBox = jQ('<div class="no-asset-alert">Sorry, no supported assets were found on this page. Try going to an asset page if you are on a list/search page. <br/><br/> If there is a video on the page, press play and then try again.</div>');
        var winWidth = jQ(window).width();
        var winHeight = jQ(window).height();
        jQ('.import-header').remove();
        
        messageBox.css({
          left: (winWidth / 2) - 262 + 'px',
          top : (winHeight / 2) - 100 + 'px'
        });

        closeBtn.click(function(){
          jQ('.sherd-analyzer').remove();
        });
        //double check no asset on page
        if(jQ('.sherd-asset li').length === 0 ){
          jQ('.sherd-analyzer').append(messageBox);
          messageBox.prepend(closeBtn);
        }
        

        
        
      };

      this.findGeneralAssets = function() {
          self.no_assets_yet = true;
          self.asset_keys = {};

          var handlers = SherdBookmarklet.assethandler;
          var frames = self.walkFrames();
          self.best_frame = frames.best;
          self.ASYNC.best_frame(frames.best);
          self.final_count += frames.all.length;

          jQ(frames.all).each(function(i,context) {
              ++self.handler_count; //for each frame
              for (var h in SherdBookmarklet.assethandler) {
                  ++self.final_count;
              }
              for (h in SherdBookmarklet.assethandler) {
                  try {///DEBUG
                      handlers[h].find.call(handlers[h],self.collectAssets,context);
                  } catch(e) {
                      ++self.handler_count;
                      SherdBookmarklet.error = e;
                      alert("Bookmarklet Error in "+h+": "+e.message);
                  }
              }
          });
      };
      this.assetHtmlID = function(asset) {
          return ('sherdbookmarklet-asset-' + (asset.ref_id || Math.floor(Math.random()*10000)));
      };
      this.redundantInGroup = function(asset, primary_type) {
          //return merged asset, so new asset has benefits of both

          self.asset_keys.ref_id = self.asset_keys.ref_id || {};
          var list = self.asset_keys[primary_type] = (self.asset_keys[primary_type] || {});
          var merge_with = false;
          if (asset.page_resource && asset != self.assets_found[0] && self.assets_found.length-self.page_resource_count < 2) {
              //if there's only one asset on the page and rest are page_resources
              merge_with = self.assets_found[self.assets_found.length-2];
          } else if (asset.ref_id && asset.ref_id in self.asset_keys.ref_id) {
              //a hack to let the page match two assets explicitly
              merge_with = self.asset_keys.ref_id[asset.ref_id];
          } else if (asset.sources[primary_type] in list) {
              //if primary source urls are identical
              merge_with = list[ asset.sources[primary_type] ];
          } 
          if (merge_with) {
              if (merge_with.html_id) {
                  self.ASYNC.remove(merge_with);
                  delete merge_with.html_id;//so it doesn't over-write asset
              } else if (window.console) window.console.log('ERROR: No html_id on merge-item');

              //jQuery 1.0compat (for drupal)
              jQ.extend(merge_with.sources, asset.sources);
              ///not trying to merge individual arrays
              if (merge_with.metadata && asset.metadata)
                  jQ.extend(merge_with.metadata, asset.metadata);
              jQ.extend(asset, merge_with);
              ///keep our pointers singular
              list[ asset.sources[merge_with.primary_type] ] = asset;
          }
          list[asset.sources[primary_type]] = asset;
          if (asset.ref_id)
              self.asset_keys.ref_id[asset.ref_id] = asset;
          return asset;
      };
      this.mergeRedundant = function(asset) {
          ///assumes assets without primary types could be redundant on anything
          ///actually, all assets must have a primary_type for assetHtmlID()
          if (asset.primary_type) {
              return this.redundantInGroup(asset, asset.primary_type);
          } else {
              throw Error("asset does not have a primary type.");
          }
      };
      this.collectAssets = function(assets,errors) {
          self.assets_found = self.assets_found.concat(assets);
          for (var i=0;i<assets.length;i++) {
              self.no_assets_yet = false;
              if (assets[i].page_resource) ++self.page_resource_count;
              var after_merge = self.mergeRedundant(assets[i]);
              if (after_merge) {
                  after_merge.html_id = self.assetHtmlID(after_merge); 
                  self.ASYNC.display(after_merge, /*index*/assets.length-1);
                  window.SherdBookmarklet.assetBucket = assets; 
                  if (window.console) {
                      window.console.log(assets);
                  }
              }
          }
          ++self.handler_count;
          if (self.handler_count >= self.final_count) {
              self.ASYNC.finish({'found':!self.no_assets_yet});
          }
      };
      this.walkFrames = function() {
          var rv = {all:[]};
          rv.all.unshift({'frame':window, 
                          'document':document,
                          'window':window,
                          'hasBody':SherdBookmarklet.hasBody(document)});
          var max =((rv.all[0].hasBody) ? document.body.offsetWidth*document.body.offsetHeight: 0);
          rv.best = ((max)? rv.all[0] : null);
          function _walk(index,domElement) {
              try {
                  var doc = this.contentDocument||this.contentWindow.document;
                  doc.getElementsByTagName('frame');//if this fails, security issue
                  var context = {
                      frame:this,document:doc,
                      window:this.contentWindow,
                      hasBody:SherdBookmarklet.hasBody(doc)
                  };
                  rv.all.push(context);
                  var area = context.hasBody * this.offsetWidth * this.offsetHeight;
                  if (area > max) {
                      rv.best = context;
                  }
                  jQ('frame,iframe',doc).each(_walk);
              } catch(e) {/*probably security error*/}
          }
          jQ('frame,iframe').each(_walk);
          return rv;
      };

  },/*****************
     END Finder
     *****************/
  "Interface" : function (host_url, options) {
      var M = SherdBookmarklet;
      this.options = {
          login_url:null,
          tab_label:"Analyze in Mediathread",
          not_logged_in_message:"You are not logged in to Mediathread.",
          login_to_course_message:"login to your Mediathread course",
          link_text_for_existing_asset:"Link in Mediathread",
          target:((M.hasBody(document))? document.body : null),
          postTarget:'_top',
          top:100,
          side:"left",
          fixed:true,
          message_no_assets:'Sorry, no supported assets were found on this page. Try going to an asset page if you are on a list/search page.  If there is a video on the page, press play and then try again.',
          message_no_assets_short:'No Items',
          message_disabled_asset:'This item cannot be embedded on external sites.',
          widget_name:'the bookmarklet'
      }; if (options) for (var a in options) {this.options[a]=options[a];}
      //bring in options from SherdBookmarkletOptions
      for (var b in this.options) {if (M.options[b]) this.options[b]=M.options[b];}
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );

      var o = this.options;
      var self = this;
      var comp = this.components = {};

      this.onclick = function(evt) {
          if (self.windowStatus) return;
          self.findAssets();
      };

      this.visibleY = function(target) {
          return target.ownerDocument.body.scrollTop;
      };
      this.loadStyles = function(){
        var jQ = window.SherdBookmarkletOptions.jQuery || window.jQuery;
        var root_url =  SherdBookmarkletOptions.host_url.split('/save/?').shift();
        jQ('head').append('<link rel="stylesheet" type="text/css" href="'+ root_url +'/media/js/sherdjs/src/bookmarklets/sherd_styles.css">');
        jQ('head').append('<link rel="stylesheet" type="text/css" href="'+ root_url +'/media/css/mediathread.css">');
      };
      this.showWindow = function() {
          self.windowStatus = true;
          if (comp.window) {
              self.loadStyles();
              comp.window.style.top = self.visibleY(comp.window)+'px';
              comp.window.style.display = "block";
              comp.tab.style.display = "none";
              jQ(comp.ul).empty();
              if (!SherdBookmarklet.user_ready()) {
                  if (SherdBookmarklet.needs_update()) {
                      // display message here
                      jQ(comp.h2).empty().get(0).appendChild(document.createTextNode('Please update'));
                      o.login_url = o.login_url || host_url.split("/",3).join("/") + "/upgrade/";
                      jQ(comp.message).empty().append(
                          self.elt(null,'span','',{},
                                   ['This Mediathread bookmarklet is outdated.',
                                    self.elt(null,'br','',{}),
                                    'To update, please ',
                                    self.elt(null,'a','',{
                                        href:o.login_url,
                                        target:'_blank',
                                        style:'color:#8C3B2E;'
                                    },['click here']),
                                    ' and follow instructions.'
                                   ]));
                  } else {
                      jQ(comp.h2).empty().get(0).appendChild(document.createTextNode('Login required'));
                      o.login_url = o.login_url || host_url.split("/",3).join("/");
                      jQ(comp.message).empty().append(
                          self.elt(null,'span','',{},
                                   [o.not_logged_in_message,
                                    self.elt(null,'br','',{}),
                                    'Please ',
                                    self.elt(null,'a','',{
                                        href:o.login_url,
                                        target:'_blank',
                                        style:'color:#8C3B2E;'
                                    },[o.login_to_course_message]),
                                    ', and then click the '+o.widget_name+' again to import items.'
                                   ]));
                  }
                  jQ('.sherd-asset').css({
                    display: 'none'
                  });
                  jQ('button').remove();
                  var messageDiv = jQ('<div class="message-div"></div>');
                  var messageClose = jQ('<div class="message-close">X<div/>');
                  var winHeight = jQ(window).height();
                  var winWidth = jQ(window).width();
                  messageClose.appendTo(messageDiv);             
                  messageDiv.css({
                    'top': winHeight/2 - 125 +'px',
                    'left': winWidth/2- 267 +'px',
                    'display': 'none'
                  }).appendTo('.sherd-analyzer');

                  jQ('.sherd-window-inner h2').addClass('not-logged-in');

                  jQ('.sherd-window-inner a').addClass('not-logged-in');

                  jQ('.sherd-window').appendTo(messageDiv);
                  messageDiv.fadeIn(1000);

                  messageDiv.click(function(){
                    jQ('.sherd-analyzer').remove();
                  });
              } else {
                  var importHeader = jQ('<h2 class="import-header"/>');
                  var importHeaderWrap = jQ('<div id="import-header-wrap"/>');
                  importHeader.text('Choose item(s) to add to collection');
                  importHeaderWrap.append(importHeader);
                  jQ(comp.h2).empty().append(importHeaderWrap);
                  if (comp.message.tagName) {
                      jQ(comp.message).empty();
                  }
              }
          }
      };
      this.elt = function(doc,tag,className,style,children) {
          ///we use this to be even more careful than jquery for contexts like doc.contentType='video/m4v' in firefox
          doc = doc || comp.top.ownerDocument;
          return M.elt(doc,tag,className,style,children);
      };
      this.setupContent = function(target) {
          var exists = jQ('div.sherd-analyzer',target);
          if (exists.length) {
              comp.top = exists.empty().get(0);
          } else {
              comp.top = target.ownerDocument.createElement("div");
              comp.top.setAttribute("class","sherd-analyzer");
              target.appendChild(comp.top);
          }
          var pageYOffset = self.visibleY(target)+o.top;
          var pageLength = jQ(document).height();
          jQ(comp.top).css('height', pageLength);
          jQ(document).scrollTop(0);//if page is long make sure the user is placed at top
          var doc = target.ownerDocument;
          comp.top.appendChild(
              self.elt(doc,'div','sherd-tab','',[o.tab_label]));
          comp.top.appendChild(
              self.elt(doc,'div','sherd-window','',
                       [
                           self.elt(doc,'div','sherd-window-inner','',[
                               self.elt(doc,'button','sherd-close btn-primary',"",['X']),
                               //self.elt(doc,'button','sherd-move',"float:right;",['Move']),
                               self.elt(doc,'button','sherd-collection btn-primary',"",['Go to Collection']),
                               self.elt(doc,'h2','','',['Select "Analyze Now" to edit one item immediately, or "Send to Collection" to send an item and keep collecting on this page.']),
                               self.elt(doc,'p','sherd-message',"",['Searching for items....']),
                               self.elt(doc,'ul','sherd-asset',"")
                           ])
                       ])
          );

          comp.tab = comp.top.firstChild;
          comp.window = comp.top.lastChild;
          comp.ul = comp.top.getElementsByTagName("ul")[0];
          comp.h2 = comp.top.getElementsByTagName("h2")[0];
          comp.close = comp.top.getElementsByTagName("button")[0];
          comp.collection = comp.top.getElementsByTagName("button")[1];
          comp.message = comp.top.getElementsByTagName("p")[0];

          M.connect(comp.tab, "click", this.onclick);
          M.connect(comp.collection, "click", function(evt) {
              hostURL = SherdBookmarkletOptions.host_url;
              var url = self.unHttpsTheLink(hostURL.split('/save/?')[0]);
              window.location.replace(url + '/asset/');
          });
          M.connect(comp.close, "click", function(evt) {
              jQ('.sherd-analyzer').remove();
              comp.window.style.display = "none";
              if(window.IEVideo){
                jQ(window.IEVideo).css('display','block');
              }
              if (SherdBookmarklet.options.decorate) {
                  comp.tab.style.display = 'block';
              }
              self.windowStatus = false;
          });
      };
      if (o.target) {
          this.setupContent(o.target);
      }

      this.findAssets = function() {
          self.showWindow();
          self.finder = new M.Finder();
          self.finder.ASYNC.display = self.displayAsset;
          self.finder.ASYNC.remove = self.removeAsset;
          self.finder.ASYNC.best_frame = self.maybeShowInFrame;
          self.finder.ASYNC.finish = self.finishedCollecting;
          self.finder.findAssets();
      };

      this.maybeShowInFrame = function(frame) {
          if (!comp.window && frame) {
              var target = o.target || frame.document.body;
              self.setupContent(target);
              self.showWindow();
          }
      };

      this.clearAssets = function() {
          jQ(comp.ul).empty();
      };
      this.removeAsset = function(asset) {
          jQ('#'+asset.html_id).remove();
      };
      this.unHttpsTheLink = function(url){
        newUrl = 'http://' + url.split('://')[1];
        return newUrl;
      };
      this.displayAsset = function(asset,index) {
        var assetUrl = asset.sources[asset.primary_type];
        if(assetUrl !== undefined){
          // make sure to strip out any url params
          asset.sources[asset.primary_type] = assetUrl.split('?')[0];
        }
          if (!asset) return;
          var doc = comp.ul.ownerDocument;
          var li = doc.createElement("li");
          var jump_url = M.obj2url(host_url, asset);
          var form = M.obj2form(host_url, asset, doc, o.postTarget, index);
          li.id = asset.html_id;
          li.appendChild(form);

          var img = asset.sources.thumb || asset.sources.image;
					var newAsset;
          if (img) {
              newAsset = self.elt(null,'img','sherd-image',{src:img,style:'max-width:215px;max-height:150px',height:null});
              jQ(form.firstChild).empty().append(newAsset);
          }else{

            asset.sources.thumb = host_url.split('save')[0] + 'media/img/nothumb_video.png';
            newAsset = self.elt(null,'img','sherd-video',{src:asset.sources.thumb,style:'max-width:215px;max-height:150px',height:null});
            jQ(form.firstChild).empty().append(newAsset);
            
          }
          if (asset.disabled) {
              form.lastChild.innerHTML = o.message_disabled_asset;
          } else if (SherdBookmarklet.user_ready()){
              form.submitButton = self.elt(null,'input','analyze btn-primary',{type:'button',value:'Open in Mediathread'});
              form.submitButton2 = self.elt(null,'input','cont btn-primary',{type:'button',value:'Collect'});
              if(!window.IEVideo){
                //the continue button is not working in IE right now
                jQ(form).append(form.submitButton2);
              }
              jQ(form).append(form.submitButton);              
              jQ(form.submitButton).click(function(){
                var action = self.unHttpsTheLink(jQ(this).parent().attr('action'));
                jQ(this).parent().attr('action', action);
                jQ(this).parent().submit();
              });
              jQ(form.submitButton2).click(function(){
                window.button_asset = jQ(this);
               /* A pop up window solution... */
                var bucketWrap = jQ('<div id="bucket-wrap"/>');
                var bucket = jQ(form).clone();
                jQ('input.analyze', bucket).remove();
                jQ('input.cont', bucket).remove();
                var bucket_window = window.open(
                   "",
                   "Mediathread",
                   "resizable,scrollbars=no,status=1,href=no,location=no,menubar=no,width=650,height=350,top=200,left=300"
                );
                if(jQ('.sherd-image',bucket_window.document).length > 0){
                  // make sure the bucket dies not already exists, if so 
                  // remove it.
                  jQ('#bucket-wrap',bucket_window.document).remove();
                }
                bucket.appendTo(bucketWrap);
                jQ(bucket).append('<input type="hidden" value="cont" name="button" />');
                jQ(bucket).append('<br/><input id="submit-input" class="btn-primary" type="button" value="Save" />');
                jQ(bucket).append('<input id="submit-cancel" class="btn-primary" type="button" value="Cancel" />');
                jQ(bucket).append('<br/><span class ="help-text">Clicking "Save" will add this item to your Mediathread collection and return you to collecting.<span/>');
                jQ(bucketWrap).prepend('<h2>Add this item to your Mediathread collection</h2>');
                jQ('body',bucket_window.document).append(bucketWrap);
                jQ('#submit-cancel',bucket_window.document).click(function(){
                  bucket_window.close();
                });
                jQ('#submit-input',bucket_window.document).click(function(){
                  jQ(this).parent().submit();
                  var sherdOverlay = jQ('.sherd-window-inner',document);
                  var alertSavedMarginLeft = (jQ('.sherd-window-inner',document).width()/2) - (535*0.5);
                  var alertSavedMarginTop = (jQ(window).height()/2) -100;
                  var collectionUrl = self.unHttpsTheLink(host_url.split('save')[0] + 'asset/');
                  var alertSaved = jQ('<div class="alert-saved"><span style="font-weight:bold">Success.</span> Your item has been sucessfully added to your <a href="'+ collectionUrl +'">Mediathread collection</a>.</div>');
                  var alertClose = jQ('<div class="alert-close">X</div>');

                  alertSaved.css({
                    'top': alertSavedMarginTop + 'px',
                    'left': alertSavedMarginLeft + 'px'

                  });
                  alertClose.click(function(){
                    jQ(this).parent().remove();
                  });
                  alertSaved.prepend(alertClose);
                  sherdOverlay.append(alertSaved);
                  alertSaved.fadeIn(500, function(){
                    var btn = window.button_asset;
                    btn.attr('value', 'Collected');
                    btn.off();
                    btn.css({
                      background:'#999',
                      color:'#333'
                    });
                  });
                });// end #submit-input' click
  
                // style and add listeners onto the popup window 
                bucket_window.document.title = "Mediathread";//force the title of the popup
                var body = jQ('body',bucket_window.document);
                var title = body.find('.sherd-form-title');
                var submitBtn = body.find('.btn-primary');
                var header = body.find('#bucket-wrap h2');
                var helpText = body.find('.help-text');
                
                bucket.css({
                   'background':"#fff",
                   'text-align': 'center'
                });
                header.css({
                  'font-family':'arial',
                  'font-weight': '100',
                  'font-size': '18px',
                  'color': '#323232',
                  'text-align':'center'
                });

                title.focus();
                title.css({
                  color:'#999',
                  width:'350px',
                  height:'35px',
                  fontSize:'14px',
                  margin:'10px 0',
                  '-moz-appearance':'none',
                  '-webkit-appearance':'none'
                });
                submitBtn.css({
                  'font-size':'14px',
                  'font-weight':'normal',
                  'color':'#2f2f2f',
                  'padding':'5px 15px',
                  'margin':'0px 12px 12px',
                  'border':'solid 1px',
                  'border-radius':'4px',
                  '-moz-border-radius':'4px',
                  '-webkit-border-radius':'4px',
                  'background-color':'#efefef',
                  '*background-color':'#efefef',
                  'background-image':'-moz-linear-gradient(top, #fcfcfc, #efefef)',
                  'background-image':'-webkit-gradient(linear, 0 0, 0 100%, from(#fcfcfc), to(#efefef))',
                  'background-image':'-webkit-linear-gradient(top, #fcfcfc, #efefef)',
                  'background-image':'-o-linear-gradient(top, #fcfcfc, #efefef)',
                  'background-image':'linear-gradient(to bottom, #fcfcfc, #efefef)',
                  'background-repeat':'repeat-x',
                  'border-color':'#0044cc #0044cc #002a80',
                  'border-color':'rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25)',
                  'filter':'progid:DXImageTransform.Microsoft.gradient(startColorstr="#ff0088cc", endColorstr="#ff0044cc", GradientType=0)',
                  'filter':'progid:DXImageTransform.Microsoft.gradient(enabled=false)',
                  'cursor':'pointer',
                  'display':'inline-block'
                });
                submitBtn.hover(function(){
                    jQ(this).css({
                    'background-image':'-moz-linear-gradient(top, #efefef, #fcfcfc)',
                    'background-image':'-webkit-gradient(linear, 0 0, 0 100%, from(#efefef), to(#fcfcfc))',
                    'background-image':'-webkit-linear-gradient(top, #efefef, #fcfcfc)',
                    'background-image':'-o-linear-gradient(top, #efefef, #fcfcfc)',
                    'background-image':'linear-gradient(to bottom, #efefef, #fcfcfc)'
                    
                  });
                }, function(){
                    jQ(this).css({
                      'background-image':'-moz-linear-gradient(top, #fcfcfc, #efefef)',
                      'background-image':'-webkit-gradient(linear, 0 0, 0 100%, from(#fcfcfc), to(#efefef))',
                      'background-image':'-webkit-linear-gradient(top, #fcfcfc, #efefef)',
                      'background-image':'-o-linear-gradient(top, #fcfcfc, #efefef)',
                      'background-image':'linear-gradient(to bottom, #fcfcfc, #efefef)'
                    });
                  });
                
                helpText.css({
                  'color':'#666',
                  'font-size': '12px',
                  'font-family': 'arial',
                });
              });//End SubmitButton2 click

                 
          }
          if (comp.ul) {
              if (comp.ul.firstChild !== null && comp.ul.firstChild.innerHTML == o.message_no_assets) {
                  jQ(comp.ul.firstChild).remove();
              }
              comp.ul.appendChild(li);
          }
      };
      this.finishedCollecting = function(results) {
        //alert(results)
          if (comp.message) {
              comp.message ="";/*erase searching message*/
              if (!results.found) {
                  jQ(comp.h2).text(o.message_no_assets_short);
                  jQ(comp.ul).html(self.elt(comp.ul.ownerDocument,'li','','',[o.message_no_assets]));
              } 
          }
      };
      this.showAssets = function(assets) {
          self.showWindow();
          self.clearAssets();
          for (var i=0;assets.length>i;i++) {
              self.displayAsset(assets[i]);
          }
          if (assets.length > 1 && o.allow_save_all) {
              self.addSaveAllButton(assets.length);
          }
      };
      this.addSaveAllButton = function(count) {
          var save_all = document.createElement('li');
          comp.ul.appendChild(save_all);
          ///TODO: cheating without possible dom weirdness
          save_all.innerHTML = '<button onclick="SherdBookmarklet.g.saveAll()">Save All '+count+' Items</button>';
          comp.saveAll = save_all;
          comp.saveAllButton = save_all.firstChild;
      };
      this.saveAll = function() {
          ///TODO: cheating without possible dom weirdness (e.g. assuming same document)
          if (!confirm('Are you sure?  This could take some time....')) {
              return;
          }
          comp.saveAllButton.disabled = true;
          comp.saveAllButton.innerHTML = 'Saving...';

          var all_forms = jQ('form', comp.ul);
          var done = 0, 
              frmids = 0,
              todo = all_forms.length,
              form_dict = {},
              updateForm = function(frm, new_href) {
                  if (frm) {
                      frm.disabled = true;
                      jQ(frm.submitButton).remove();
                      if (new_href) {
                          jQ(frm).append(self.elt(null,'span','',{},[
                              self.elt(null,'a','',{href:new_href},[o.link_text_for_existing_asset])
                          ]));
                      } else {
                          jQ(frm).append(self.elt(null,'span','',{},[' Saved! ']));
                      }
                  }
              };
          if (window.postMessage) {
              jQ(window).bind('message',function(jevt) {
                  //eh, let's not use this after all
                  var evt = jevt.originalEvent;
                  if (host_url.indexOf(evt.origin) === -1 ) 
                      return;
                  var parsed = evt.data.split('|');
                  updateForm(form_dict[ parsed[1] ], parsed[0]);
              });
          }
          all_forms.each(function() {
              var iframe = document.createElement('iframe');
                  iframe.height = iframe.width = 1;
                  iframe.id = this.id + '-iframesubmit';
              comp.window.appendChild(iframe);
              var target = iframe.contentDocument||iframe.contentWindow.document;


              var new_frm = target.createElement('form');
                  new_frm.action = this.action;
                  new_frm.method = 'POST';
                  new_frm.innerHTML = this.innerHTML;
              target.body.appendChild(new_frm);

              var noui = target.createElement('input');
                  noui.name = 'noui';
                  noui.value = 'postMessage'+ (++frmids);
                  noui.type = 'hidden';
              new_frm.appendChild(noui);

              //save value so we can get to it later
              this.id = 'sherdbookmarklet-form-'+ (noui.value);
              form_dict[noui.value] = this;

              //special since it was set by DOM (or changed) above
              new_frm.elements.title.value = this.elements.title.value;
              
              jQ(iframe).load(function(evt) {
                  ++done;
                  comp.saveAllButton.innerHTML = 'Saved '+done+' of '+todo+'...';

                  var frmid = String(this.id).slice(0,-('-iframesubmit'.length));
                  updateForm(document.getElementById(frmid), false);
                  
              });
              new_frm.submit();
              
          });
          //TODO: this will be a huge pain, since it needs to be cross-domain.
      };

  }, /*END Interface*/
   getURLParameters: function(name) {
  		return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
  }
};/*SherdBookmarklet (root)*/

if (!window.SherdBookmarkletOptions) {
    window.SherdBookmarkletOptions = {};
}

if (SherdBookmarkletOptions.decorate) {
    var scripts = document.getElementsByTagName("script");
    var i = scripts.length;
    while (--i >= 0) {
        var me_embedded = scripts[i];
        if (/bookmarklets\/analyze.js/.test(me_embedded.src)) {
            var sbo = window.SherdBookmarkletOptions;
            sbo.host_url=String(me_embedded.src).split("/",3).join("/")+"/save/?";
            sbo.action = "decorate";
            
            SherdBookmarklet.runners[sbo.action](sbo.host_url,true);
            break;
        }
    }
} else if (window.chrome && chrome.extension) {
    ///1. search for assets--as soon as we find one, break out and send show:true
    ///2. on request, return a full asset list
    ///3. allow the grabber to be created by sending an asset list to it
    SherdBookmarklet.options = SherdBookmarkletOptions;
    var finder = new SherdBookmarklet.Finder();
    var found_one = false;
    finder.ASYNC.display = function(asset) {
        if (!asset.disabled && !found_one) {//just run once
            found_one = true;
            ///request sent TO background.html
            chrome.extension.sendRequest({found_asset:true,show_icon:true}, function(response) {});
        }
    };
    ///request sent TO background.html
    chrome.extension.sendRequest({show_icon:true}, function(response) {});
    function cleanup(obj) {
        var json_safe =  JSON.parse(
            JSON.stringify(obj,function(key,value){
                if (typeof value=='object' && value.tagName) {
                    return '';
                } else return value;
            }));
        //remove merged assets
        for (var i=0;i<json_safe.length;i++) {
            if ( ! json_safe[i].html_id)
                json_safe.splice(i--,1); //decrement after splice to combat loop
        }
        return json_safe;
    }
    chrome.extension.onRequest.addListener(
        //for request sent FROM popup.html
        function(request,sender,sendResponse) {
            if (finder.assets_found.length) {
                sendResponse({'assets':cleanup(finder.assets_found)});
            } else {
                ///try again
                finder.ASYNC.display = function(asset) {
                    sendResponse({'assets':cleanup(finder.assets_found),
                                  'where':'after'
                                 });
                };
                finder.findAssets();
            }
        });
    finder.findAssets();
} else {
    var o = SherdBookmarkletOptions;
    SherdBookmarklet.options = o;
    SherdBookmarklet.debug = o.debug;
    if (o.user_status) {
        SherdBookmarklet.update_user_status(o.user_status);
    }
    SherdBookmarklet.runners[o.action](o.host_url,true);
}

