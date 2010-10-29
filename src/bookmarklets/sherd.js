/*RULES
  1. NO single quote characters
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
  update_user_status:function(user_status) {
      var uninit = (! window.SherdBookmarklet.user_status.ready);
      for (a in user_status) {
          window.SherdBookmarklet.user_status[a] = user_status[a];
      }
      if (window.console) {
          window.console.log(user_status);
      }
      //Safari sometimes loads logged_in.js last, even when added first
      if (uninit && user_status.ready && SherdBookmarklet.g) {
          //find assets again
          SherdBookmarklet.g.findAssets();
      }
  },
  "hosthandler": {
    /*Try to keep them ALPHABETICAL by 'brand' */
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
                }
                for (var i=0;i<found_images.length;i++) {
                    function getArtStorData(obj) {
                        jQuery
                        .ajax({url:"http://"+location.hostname+"/library/secure/imagefpx/"+obj.artstorId+"/103/5",
                               dataType:'json',
                               success:function(fpxdata,textStatus) {
                                   var f = fpxdata[0];
                                   obj.sources["fsiviewer"] = "http://viewer2.artstor.org/erez3/fsi4/fsi.swf";
                                   obj.sources["image_fpx"] = f.imageServer+f.imageUrl;
                                   obj.sources["image_fpx-metadata"] = "w"+f.width+"h"+f.height;
                                   if (--done==0) obj_final();
                               },
                               error:function(){
                                   if (--done==0) obj_final();
                               }
                              });
                        jQuery
                        .ajax({url:"http://"+location.hostname+"/library/secure/metadata/"+obj.artstorId,
                               dataType:'json',
                               success:function(metadata,textStatus) {
                                   var img_link = metadata.imageUrl.match(/size\d\/(.*)\.\w+$/);
                                   obj.sources["title"] = metadata.title;
                                   obj.sources["thumb"] = "http://library.artstor.org"+metadata.imageUrl;
                                   var m = metadata.metaData;
                                   for (var i=0;i<m.length;i++) {
                                       ///so multiple values are still OK
                                       if (m[i].fieldName in obj.metadata) {
                                           obj.metadata[m[i].fieldName].push(m[i].fieldValue);
                                       } else {
                                           obj.metadata[m[i].fieldName] = [m[i].fieldValue];
                                       }
                                   }
                                   if (--done==0) obj_final(); 
                               },
                               error:function(){
                                   if (--done==0) obj_final(); 
                               }
                              });
                    }
                    getArtStorData(found_images[i]);
                }
            });
        }
    },
    "dropbox.com": {
        find:function(callback) {
            var rv = [], 
                save_link = document.getElementById('gallery_save');
            if (save_link && window.token && token.user_id
                && token.path == '/Public') {
                var regex = String(save_link.href).match(/dropbox.com\/s\/[^\/]+(\/[^?]+)/);
                if (regex) {
                    rv.push({
                        primary_type:'image',
                        sources:{
                            'image':'http://dl.dropbox.com/u/'+token.user_id+regex[1],
                            'url':String(document.location)
                        }
                    })
                }
            }
            callback(rv);
        }
    },
    "flickr.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function(jQuery) { 
                var apikey = SherdBookmarklet.options.flickr_apikey;
                if (!apikey) 
                    return callback([]);

                var bits = document.location.pathname.split("/");//expected:/photos/<userid>/<imageid>/
                var imageId = bits[3];

                if (imageId.length < 1 || imageId.search(/\d{1,12}/) < 0)
                    return callback([]);

                /* http://docs.jquery.com/Release:jQuery_1.2/Ajax#Cross-Domain_getJSON_.28using_JSONP.29 */
                var baseUrl = "http://api.flickr.com/services/rest/?format=json&api_key="
                    +apikey+"&photo_id="+imageId
                    + ((SherdBookmarklet.options.cross_origin) ? '&nojsoncallback=1' : '&jsoncallback=?');
                jQuery.getJSON(baseUrl + "&method=flickr.photos.getInfo",function(getInfoData) {
                        if (getInfoData.photo.media=="video") {
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
                                        "archive": "http://www.flickr.com/photos/" + getInfoData.photo.owner.nsid, /* owner's photostream */
                                        "image-metadata":"w"+w+"h"+h,
                                        "metadata-owner":getInfoData.photo.owner.realname ||undefined
                                    };

                                return callback( [{html:img, primary_type:"image", sources:sources}] );
                            })
                });/*end jQuery.ajax*/
            });/*end run_with_jquery*/
        },
        decorate:function(objs) {
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
                                var img = document.createElement('img');
                                img.src = image_data.sources.image;
                                image_data.sources['image-metadata']="w"+img.width+"h"+img.height
                                rv.push(image_data);
                                jQuery('#flashcontent').hide();
                                
                            });
                            return callback(rv);
                        },
                        error:function(err,xhr){ return callback(rv); }
                    });
                }
                if (done) return callback(rv);
            })
        }
    },
    "thlib.org": {
        /*e.g. those on http://www.thlib.org/places/monasteries/meru-nyingpa/murals/ */
        also_find_general:true,
        find:function(callback) {
            if (window.frames["gallery"]) {
                var myloc = window.frames["gallery"].location.href; 
                var matches =  myloc.match(/(.*)\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);/*split last 3 "/" */
                if(typeof(myloc) == "string" && matches[4] != "gallery.html") { 
                    var img_key = matches[3];
                    var img_root = matches[1];
                    var tile_root = img_root+"/source/"+img_key+"/"+img_key;
                    var thumb = img_root+"/preview/"+img_key.toLowerCase()+".jpg";
                    var img = document.createElement("img");
                    img.src = tile_root+"/TileGroup0/0-0-0.jpg";
                    var sources = {
                        "title":img_key,
                        "archive":String(document.location),
                        /*must be unique, but no good return link :-(*/
                        "url":tile_root+".htm", 
                        "xyztile":tile_root + "/TileGroup0/${z}-${x}-${y}.jpg",
                        "image-metadata":"w"+img.width+"h"+img.height,
                        "thumb":thumb,
                        "image":img.src /*nothing bigger available*/
                    };
                    /*could do a query to see what the full dimensions are of the tiles
                      but instead of this hack what about using 
                      img_root+"/source/"+img_key+"/"+img_key+"/ImageProperties.xml"
                     */
                    jQuery.get(tile_root+"/ImageProperties.xml",null,function(dir) {
                        /*was for url = tile_root+"/TileGroup0/" parsing:
                          var zooms = dir.split("\">").reverse()[3].match(/\d+/);
                          var exp = Math.pow(2,zooms);
                          sources["xyztile-metadata"] = "w"+(img.width*exp)+"h"+(img.height*exp);
                         */
                        var sizes = dir.match(/WIDTH=\"(\d+)\"\s+HEIGHT=\"(\d+)\"/);
                        sources["xyztile-metadata"] = "w"+(sizes[1])+"h"+(sizes[2]);
                        callback( [{"html": window.frames["gallery"].document["Zoomify Dynamic Flash"], 
                                    "sources": sources,
                                    "primary_type": 'image'
                                   } ]);
                    },"text");
                    return; //found something
                }
            } 
            return callback([]);
        },
        decorate:function(objs) {
        }
    }, /*end thlib.org */
    "vietnamwararchive.ccnmtl.columbia.edu": {
        single:function() {
            return (document.location.pathname.search("/record/display") == 0);
        },
        find:function(callback) {
            var rv = [];
            if (this.single()) 
                rv = [ this.update() ];
            callback(rv);
        },
        decorate:function(objs) {
        },
        update:function(obj) {
            var hash = false;
            var embs = document.getElementsByTagName("embed");
            if (embs.length) {
                var e = embs[0];
                if (e && e.Stop) {
                    try{
                        e.Stop();
                        hash = "start="+Math.floor(e.GetTime()/e.GetTimeScale());
                    } finally{}
                }
            }
            var thumb;
            if (SHARETHIS 
                && typeof SHARETHIS.shareables == "object"
                && SHARETHIS.shareables.length
               ) {
                thumb = SHARETHIS.shareables[0].properties.icon;
            }
            return {"html":$(".media").get(0),
                    "hash": hash||undefined,
                    "primary_type": 'quicktime',
                    "sources":{
                        "title":document.title,
                        "quicktime":$(".media").media("api").options.src,
                        "poster":$(".media img").get(0).src,
                        "thumb": thumb
                    }
                   };
        }
    },
    "youtube.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {
                var video = document.getElementById("movie_player");
                if (video && video != null) {
                    SherdBookmarklet.assethandler.objects_and_embeds.players
                    .youtube.asset(video, 
                                   video.getAttribute('flashvars').match(/video_id=([^&]*)/),
                                   {'window':window,'document':document},0,
                                   function(ind,rv){ callback([rv]); });
                } else callback([]);
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
                      return (('object'==eo.tagName.toLowerCase())
                              ?(eo.classid=="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA"&&'obj')||null
                              :(String(eo.type) == 'audio/x-pn-realaudio-plugin' && 'emb') || null );
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
                          rv.sources["realplayer"] = abs(emb.src, context.document);
                      } else if (match=='obj') {
                          var src = jQ('param[name=src],param[name=SRC]',emb);
                          if (src.length) {
                              rv.sources["realplayer"] = abs(src.get(0).value, context.document);
                          } else {
                              return rv;//FAIL
                          }
                      }

                      if (typeof emb.DoPlay != 'undefined') {
                          rv.sources["realplayer-metadata"] = "w"+(
                              emb.GetClipWidth() || emb.offsetWidth
                          )+"h"+(emb.GetClipHeight() || emb.offsetHeight);

                          rv.sources["title"] = emb.GetTitle() || undefined;
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
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var VIDEO_ID = match[1]; //e.g. "LPHEvaNjdhw"
                      var rv = {
                          html:emb,
                          wait:true,
                          primary_type:"youtube",
                          label:"youtube video",
                          sources: {
                              "youtube":"http://www.youtube.com/v/"+VIDEO_ID+"?enablejsapi=1&fs=1",
                              ///DOCS: http://code.google.com/apis/youtube/2.0/reference.html#Searching_for_videos
                              "gdata":'http://gdata.youtube.com/feeds/api/videos/'+VIDEO_ID
                          }};
                      if (emb.getCurrentTime) {
                          if (emb.getCurrentTime() == emb.getDuration()) 
                              rv["hash"]="start="+emb.getCurrentTime();
                      }
                      var yt_callback = 'sherd_youtube_callback_'+index;
                      window[yt_callback] = function(yt_data) {
                          var e = yt_data['entry'];
                          rv.sources['title'] = e.title['$t'];
                          var th = e['media$group']['media$thumbnail'][0];
                          rv.sources['thumb'] = th.url;
                          rv.sources['thumb-metadata'] = "w"+th.width+"h"+th.height;
                          rv.metadata = {
                              'description':[e['media$group']['media$description']['$t']],
                              'author':[e.author[0].name['$t']],
                              'author_uri':[e.author[0].uri['$t']],
                              'published':[e.published['$t']],
                              'youtube_link':['http://www.youtube.com/watch?v='+VIDEO_ID]
                          };
                          if (e['media$group']['media$category'].length) {
                              rv.metadata['category'] = [e['media$group']['media$category'][0].label];
                          }
                          if (e['yt$noembed']) {
                              rv.disabled = true;
                          }
                          optional_callback(index, rv);
                      }
                      var ajax_options = {
                          url: rv.sources.gdata+'?v=2&alt=json-in-script&callback='+yt_callback,
                          dataType: 'script',
                          error:function(){optional_callback(index);}
                      }
                      if (SherdBookmarklet.options.cross_origin) {
                          ajax_options['dataType'] = 'json';
                          ajax_options['success'] = window[yt_callback];
                          ajax_options['url'] = rv.sources.gdata+'?v=2&alt=json';
                      }
                      jQ.ajax(ajax_options);
                      return rv;
                  }
              },/*end youtube embeds*/
              "flowplayer3":{
                  match:function(obj) {
                      if (obj.data) {
                          return String(obj.data).match(/flowplayer[\.\-\w]+3[.\d]+\.swf/);
                      } else {//IE7 ?+
                          var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                          var movie = jQ('param[name=movie]',obj);
                          return ((movie.length) 
                                  ?String(movie.get(0).value).match(/flowplayer-3[\.\d]+\.swf/)
                                  :null);
                      }
                  },
                  asset:function(obj,match,context) {
                      /* TODO: 1. support audio
                               2. 
                       */
                      var sources = {};
                      var abs = SherdBookmarklet.absolute_url;
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var $f = (context.window.$f && context.window.$f(obj.parentNode));
                      
                      var cfg = (($f)? $f.getConfig() 
                                 :jQ.parseJSON(jQ('param[name=flashvars]').get(0)
                                               .value.substr(7)));//config=
                      //getClip() works if someone's already clicked Play
                      var clip = ($f && $f.getClip() ) || cfg.clip || cfg.playlist[0];
                      var time = ($f && $f.getTime() ) || 0;
                      var type = 'video';
                      if (cfg.playlist && ( !clip.url || cfg.playlist.length > 1)) {
                          for (var i=0;i<cfg.playlist.length;i++) {
                              var p = cfg.playlist[i];
                              var url =  abs((typeof p=='string') ? p : p.url,context.document);
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
                      sources[primary_type] = clip.originalUrl || clip.resolvedUrl || clip.url || clip;
                      if (provider && provider.netConnectionUrl)
			  sources[primary_type] = provider.netConnectionUrl+sources[primary_type]

                      ///TODO:is context.document the right relative URL instead of the SWF?
		      sources[primary_type] = abs(sources[primary_type],context.document);
                      if (/_pseudo/.test(primary_type)
                          && cfg.plugins[clip.provider].queryString
                         ) {
                          sources[primary_type] += unescape(cfg.plugins[clip.provider].queryString);
                      }
                      if (clip.width && clip.width >= obj.offsetWidth) {
                          sources[primary_type+"-metadata"] = "w"+clip.width+"h"+clip.height;
                      } else {
                          sources[primary_type+"-metadata"] = "w"+obj.offsetWidth+"h"+(obj.offsetHeight-25);
                      }
                      return {
                          "html":obj,
                          "sources":sources,
                          "label":"video",
                          "primary_type":primary_type,
                          "hash":"start="+Math.floor(time),
                          "ref_id":($f && $f.id() || undefined) //used for merging
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
                          if (stream != null) {
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
              "quicktime":{
                  match:function(objemb) {
                      return (objemb.classid=="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" 
                              || String(objemb.type).match(/quicktime/) != null
                              || String(objemb.src).match(/\.(mov|m4v)$/) != null
                             ) || null;
                  },
                  asset:function(objemb,match,context) {
                      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );
                      var abs = SherdBookmarklet.absolute_url;
                      var src = objemb.src || jQ('param[name=src],param[name=SRC]',objemb);
                      if (src.length) {
                          src = (src.get) ? src.get(0).value : src;
                          return {
                              "html":objemb,
                              "primary_type":'quicktime',
                              "sources":{
                                  "quicktime":abs(src, context.document),
                                  "quicktime-metadata":"w"+objemb.offsetWidth+"h"+objemb.offsetHeight
                              }
                          }
                      } else {
                          return {};
                      }
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
              }
              function matchNsniff(oe) {
                  for (p in self.players) {
                      var m = self.players[p].match(oe);
                      if (m != null) {
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
              for (var i=0;i<embs.length;i++) 
                  matchNsniff(embs[i]);
              for (var i=0;i<objs.length;i++) 
                  matchNsniff(objs[i]);

              if (waiting==0)
                  callback(result);
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
                  var mtype = String(video.type).match(codecs)
                  if (mtype) {
                      vid_type = mtype[1].toLowerCase();
                      if (video.canPlayType(video.type)=="probably")
                          rv.primary_type = vid_type;
                  } else if (mtype = String(source.src).match(codecs)) {
                      vid_type = mtype[1].toLowerCase().replace('ogv','ogg');
                  }
                  if (rv.primary_type == 'video')
                      rv.primary_type = vid_type;
                  rv.sources[vid_type] = source.src;
                  rv.sources[vid_type+'-metadata'] = "w"+video.videoWidth+"h"+video.videoHeight
              }
              for (var i=0;i<videos.length;i++) {
                  var rv = {
                      "html":videos[i],
		      "label": "video",
                      "primary_type":"video",
                      "sources": {}
                  }
                  if (videos[i].poster) {
                      rv.sources['poster'] = videos[i].poster;
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
                  if (/(footer|header)/.test(image.className)
                      ||/site_title/.test(image.parentNode.parentNode.className)//WGBH header
                      ||/logo/.test(image.id) //drupal logo
                      ||/logo\W/.test(image.src) //web.mit.edu/shakespeare/asia/
                     ) continue;
                  /*recreate the <img> so we get the real width/height */
                  var image_ind = document.createElement('img');
                  image_ind.src = image.src;
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
                                  if (--done==0) callback(result);
                              },"text");
                          }
                      }
                  }
              }
              for (var i=0;i<result.length;i++) {
                  result[i].metadata = SherdBookmarklet.microdataSearch(result[i].html) || undefined;
                  if (result[i].metadata && result[i].metadata.title) {
                      result[i].sources["title"] = result[i].metadata.title.shift();
                  }
              }
              if (done==0) callback(result);
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
                      if (reg != null) {
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
                                  if (titleType == 'Element'
                                      || document.title.indexOf(this.firstChild.data) > -1
                                     ) {
                                      rv.sources.title = this.firstChild.data;
                                  } else {
                                      rv.metadata[titleType+':Title'] = [this.firstChild.data];
                                  }
                              });
                              jQ('description',pb).each(function() {
                                  rv.metadata['description'] = [this.firstChild.data];
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
                                  rv.metadata['Copyrights'] = [this.firstChild.data];
                              });
                              jQ('subject',pb).each(function() {
                                  ///TODO: should we care about the subjectAuthorityUsed?
                                  rv.metadata['subject'].push(this.firstChild.data);
                              });
                              jQ('publisher',pb).each(function() {
                                  rv.metadata['publisher'] = [this.firstChild.data];
                              });
                              ///TODO: should we get video metadata (betacam, aspect ratio)?
                              callback([rv]);
                          },
                          error:function(){callback([]);}
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
                                  result.sources["image"] = json.url;
                                  ///extension: openlayers tiling protocol
                                  if (json.xyztile) {
                                      var xyz = json.xyztile;
                                      result.sources["xyztile"] = xyz.url;
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
                                  return callback([])
                              }
                              result.sources[result.primary_type+'-metadata'] = 
                                  "w"+json.width+"h"+json.height;
                          }
                          if (json.thumbnail_url) {
                              result.sources["thumb"] = json.thumbnail_url;
                              result.sources["thumb-metadata"]="w"+json.thumbnail_width+"h"+json.thumbnail_height;
                          }
                          if (json.title) {
                              result.sources["title"] = json.title;
                          }
                          if (json.description) {
                              result.metadata["description"] = [json.description];
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
      hosthandler['mcah.columbia.edu'] = hosthandler['learn.columbia.edu'] 
      for (host in hosthandler) {
          if (new RegExp(host+'$').test(location.hostname)) 
              return hosthandler[host];
      }
  },/*gethosthandler*/
  "obj2url": function(host_url,obj) {
    /*excluding metadata because too short for GET string*/
    if (!obj.sources["url"]) obj.sources["url"] = String(document.location);
    var destination =  host_url;
    for (a in obj.sources) {
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
      if (!obj.sources["url"]) obj.sources["url"] = String(doc.location)  
          ///if more than one asset, we should try to prefix this to keep url= unique
          + (index ? '#'+obj.sources[obj.primary_type].split('#')[0].split('/').pop() : '');
      var destination =  host_url;
      if (obj.hash) {
          destination += "#"+obj.hash;
      }
      var form = M.elt(doc,'form','',{},[
          M.elt(doc,'span','',{}),
          M.elt(doc,'div','','border:0;margin:0;float:right;',
                ['Type: '+(obj.label||obj.primary_type||'Unknown')])
      ]); 
      form.action = destination;
      form.target = target;
      var ready = M.user_ready();
      form.method = (ready) ? 'POST' : 'GET'; 
      /* just auto-save immediately
       * this also allows us to send larger amounts of metadata
       */
      function addField(name,value) {
          var span = doc.createElement("span");
          var item = doc.createElement("input");
          if (name=="title") {
              item.type = "text";
              //IE7 doesn't allow setAttribute here, mysteriously
              item.style.display = "block";
              item.style.width = "90%";
              item.className = "sherd-form-title";
          } else {
              item.type = "hidden";
          }
          item.name = name;
          ///Ffox bug: this must go after item.type=hidden or not set correctly
          item.value = value;
          form.appendChild(span);
          form.appendChild(item);
          return item;
      }
      for (a in obj.sources) {
          if (typeof obj.sources[a] =="undefined") continue;
          var item = addField(a, obj.sources[a]);
      }
      if (!obj.sources.title) {
          //guess title as file-name
          addField('title', obj.sources[obj.primary_type].split('/').pop().split('?').shift() );
      }
      if (ready && obj.metadata) {
          for (a in obj.metadata) {
              for (var i=0;i<obj.metadata[a].length;i++) {
                  addField("metadata-"+a, obj.metadata[a][i]);
              }
          }
      }
      form.appendChild(doc.createElement("span"));
      return form;
  },/*obj2url*/
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
            switch (assets.length) {
            case 0: 
                if (handler.also_find_general) {
                    M.run_with_jquery(grabber_func);
                    return;
                }
                var message = error||"This page does not contain any supported media assets. Try going to an asset page.";
                return alert(message);
            case 1:
                if (assets[0].disabled)
                    return alert("This asset cannot be embedded on external sites. Please select another asset.");

                if (jump_now && !M.debug) {
                    //document.location = M.obj2url(host_url, assets[0]);
                    var form = M.obj2form(host_url, assets[0]);
                    document.body.appendChild(form); //for IE7 sux
                    form.submit();
                }
                break;
            default:
                M.g = new M.Interface(host_url);
                M.g.showAssets(assets);
            }
            if (window.console) {/*if we get here, we're debugging*/
                window.console.log(assets);
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
  "microdataSearch":function(elem) {
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
                      props[p].push(abs(this.href));
                  case "audio":case "embed":case "iframe":case "img":case "source":case "video":
                      props[p].push(abs(this.src));
                  default:
                      props[p].push(jQ(this).text());
                  }
              });
              return props;
          }
      }
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
  "absolute_url":function (maybe_local_url, doc) {
      if (/:\/\//.test(maybe_local_url)) {
          return maybe_local_url;
      } else {
          var cur_loc = doc.location.toString().split('?')[0].split('/');
          if (maybe_local_url.indexOf('/') == 0) {
              return cur_loc.splice(0,3).join('/') + maybe_local_url;
          } else {
              cur_loc.pop();///filename
              
              while (maybe_local_url.indexOf('../') == 0) {
                  cur_loc.pop();
                  maybe_local_url = maybe_local_url.substr(3);
              }
              return cur_loc.join('/') + '/' + maybe_local_url;
          }
      }
  },
  "elt":function(doc,tag,className,style,children) {
      ///we use this to be even more careful than jquery for contexts like doc.contentType='video/m4v' in firefox
      var t = doc.createElement(tag);
      t.setAttribute('class',className);
      if (typeof style == 'string')
          t.setAttribute('style',style);
      else for (a in style) {
          t.setAttribute(a,style[a]);
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
      }

      this.bestFrame = function() {
          return self.best_frame;
      }

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
              for (h in SherdBookmarklet.assethandler) {
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
      }
      this.assetHtmlID = function(asset) {
          return ('sherdbookmarklet-asset-' + (asset.ref_id || Math.floor(Math.random()*10000)));
      }
      this.redundantInGroup = function(asset, primary_type) {
          //return merged asset, so new asset has benefits of both

          self.asset_keys['ref_id'] = self.asset_keys['ref_id'] || {};
          var list = self.asset_keys[primary_type] = (self.asset_keys[primary_type] || {});
          var merge_with = false;
          if (asset.page_resource
              && asset != self.assets_found[0]
              && self.assets_found.length-self.page_resource_count < 2
             ) {
              //if there's only one asset on the page and rest are page_resources
              merge_with = self.assets_found[self.assets_found.length-2];
          } else if (asset.ref_id && asset.ref_id in self.asset_keys['ref_id']) {
              //a hack to let the page match two assets explicitly
              merge_with = self.asset_keys['ref_id'][asset.ref_id];
          } else if (asset.sources[primary_type] in list) {
              //if primary source urls are identical
              merge_with = list[ asset.sources[primary_type] ];
          } 
          if (merge_with) {
              if (merge_with.html_id) {
                  self.ASYNC.remove(merge_with)
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
              self.asset_keys['ref_id'][asset.ref_id] = asset;
          return asset;
      }
      this.mergeRedundant = function(asset) {
          ///assumes assets without primary types could be redundant on anything
          ///actually, all assets must have a primary_type for assetHtmlID()
          if (asset.primary_type) {
              return this.redundantInGroup(asset, asset.primary_type);
          } else {
              throw Error("asset does not have a primary type.");
              for (s in this.asset.sources) {
                  if (s=='url' || s.indexOf('-metadata') > -1) 
                      continue;
                  var rig = this.redundantInGroup(asset, s);
                  if (rig) return rig;
              }
              return asset;
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
              }
          }
          ++self.handler_count;
          if (self.handler_count >= self.final_count) {
              self.ASYNC.finish({'found':!self.no_assets_yet});
          }
      };
      this.walkFrames = function() {
          var rv = {all:[]}
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
                      hasBody:self.hasBody(doc)
                  };
                  rv.all.push(context);
                  var area = self.hasBody(doc) * this.offsetWidth * this.offsetHeight;
                  if (area > max) {
                      rv.best = context;
                  }
                  jQ('frame,iframe',doc).each(_walk);
              } catch(e) {/*probably security error*/}
          }
          jQ('frame,iframe').each(_walk);
          return rv;
      }

  },/*****************
     END Finder
     *****************/
  "Interface" : function (host_url, options) {
      var M = SherdBookmarklet;
      this.options = {
          tab_label:"Analyze in Mediathread",
          target:((M.hasBody(document))? document.body : null),
          postTarget:'_top',
          top:100,
          side:"left",
          fixed:true,
          message_no_assets:'Sorry, no supported assets were found on this page. Try going to an asset page if you are on a list/search page.  If there is a video on the page, press play and then try again.',
          message_no_assets_short:'No Items',
          message_disabled_asset:'This item cannot be embedded on external sites.',
          widget_name:'the bookmarklet'
      }; if (options) for (a in options) {this.options[a]=options[a]};
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
      }
      this.showWindow = function() {
          self.windowStatus = true;
          if (comp.window) {
              comp.window.style.top = self.visibleY(comp.window)+'px';
              comp.window.style.display = "block";
              comp.tab.style.display = "none";
              jQ(comp.ul).empty();
              if (!SherdBookmarklet.user_ready()) {
                  jQ(comp.h2).text('Login required');
                  o.login_url = o.login_url || host_url.split("/",3).join("/");
                  jQ(comp.message).empty().append(
                      self.elt(null,'span','',{},
                               ['You are not logged in to MediaThread.',
                                self.elt(null,'br','',{}),
                                'Please ',
                                self.elt(null,'a','',{
                                    href:o.login_url,
                                    target:'_blank',
                                    style:'color:#8C3B2E;'
                                },['login to your MediaThread course']),
                                ', and then click the '+o.widget_name+' again to import items.'
                               ])
                  );
              } else {
                  jQ(comp.h2).empty().get(0).appendChild(document.createTextNode('Choose an item to import for analysis'));
                  jQ(comp.message).empty();
              }
          }

      };
      this.elt = function(doc,tag,className,style,children) {
          ///we use this to be even more careful than jquery for contexts like doc.contentType='video/m4v' in firefox
          doc = doc || comp.top.ownerDocument;
          return M.elt(doc,tag,className,style,children);
      }
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
          var doc = target.ownerDocument;
          comp.top.appendChild(
              self.elt(doc,'div','sherd-tab',
                       "display:block;position:absolute;"+o.side+":0px;z-index:999998;height:2.5em;top:"+pageYOffset+"px;color:black;font-weight:bold;margin:0;padding:5px;border:3px solid black;text-align:center;background-color:#cccccc;text-decoration:underline;cursor:pointer;text-align:left;",
                       [o.tab_label]));
          comp.top.appendChild(
              self.elt(doc,'div','sherd-window',"display:none;left:0;position:absolute;z-index:999999;top:0;margin:0;padding:0;width:400px;height:400px;overflow:hidden;border:3px solid black;text-align:left;background-color:#cccccc",
                       [
                           self.elt(doc,'div','sherd-window-inner',"overflow-y:auto;width:384px;height:390px;margin:1px;padding:0 6px 6px 6px;border:1px solid black;",[
                               self.elt(doc,'button','sherd-close',"float:right;",['close']),
                               self.elt(doc,'button','sherd-move',"float:right;",['move']),
                               self.elt(doc,'h2','','',['Choose an item to import for analysis']),
                               self.elt(doc,'p','sherd-message',"",['Searching for items....']),
                               self.elt(doc,'ul','',"")
                           ])
                       ])
          );

          comp.tab = comp.top.firstChild;
          comp.window = comp.top.lastChild;
          comp.ul = comp.top.getElementsByTagName("ul")[0];
          comp.h2 = comp.top.getElementsByTagName("h2")[0];
          comp.close = comp.top.getElementsByTagName("button")[0];
          comp.move = comp.top.getElementsByTagName("button")[1];
          comp.message = comp.top.getElementsByTagName("p")[0];

          M.connect(comp.tab, "click", this.onclick);
          M.connect(comp.move, "click", function(evt) {
              var s = comp.window.style;
              var dir = ((s.left=='0px')? 'right' : 'left');
              s.left = s.right = null;
              s[dir] = '0px';
          });
          M.connect(comp.close, "click", function(evt) {
              jQ(comp.ul).empty();
              comp.window.style.display = "none";
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
          if (!comp.window && frames.best) {
              var target = o.target || frame.document.body;
              self.setupContent(target);
              self.showWindow();
          }
      };

      this.clearAssets = function() {
          jQ(comp.ul).empty();
      }
      this.removeAsset = function(asset) {
          jQ('#'+asset.html_id).remove();
      };

      this.displayAsset = function(asset,index) {
          if (!asset) return;
          var doc = comp.ul.ownerDocument;
          var li = doc.createElement("li");
          var jump_url = M.obj2url(host_url, asset);
          var form = M.obj2form(host_url, asset, doc, o.postTarget, index);
          li.id = asset.html_id;
          li.appendChild(form);
          li.style.listStyleType = 'none';
          li.style.padding = '4px';
          li.style.margin = '4px';
          li.style.border = '1px solid black';
          jQ('input.sherd-form-title',form).prev().empty().append(self.elt(null,'div','','margin:0;border:0;padding:3px 0;',[self.elt(null,'label','',{label:'title'},['Title:'])]));

          var img = asset.sources.thumb || asset.sources.image;
          if (img) {
              jQ(form.firstChild).empty().append(self.elt(null,'img','',{src:img,style:'width:20%;max-width:120px;max-height:120px;'}));
          }
          if (asset.disabled) {
              form.lastChild.innerHTML = o.message_disabled_asset;
          } else if (SherdBookmarklet.user_ready()){
              jQ(form.lastChild).empty().append(self.elt(null,'input','',{type:'submit',style:'display:block;padding:4px;margin:4px;',value:'analyze'}));
          }

          if (comp.ul) {
              if (comp.ul.firstChild != null 
                  && comp.ul.firstChild.innerHTML == o.message_no_assets) {
                  jQ(comp.ul.firstChild).remove();
              }
              comp.ul.appendChild(li);
          }
      };
      this.finishedCollecting = function(results) {
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
      };

  }/*Interface*/
};/*SherdBookmarklet (root)*/

window.MondrianBookmarklet = SherdBookmarklet; //legacy name
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
    }
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
                }
                finder.findAssets();
            }
        });
    finder.findAssets();
} else {
    var o = SherdBookmarkletOptions;
    var host_url = o.host_url || o.mondrian_url;//legacy name
    SherdBookmarklet.options = o;
    SherdBookmarklet.debug = o.debug;
    if (o.user_status) {
        SherdBookmarklet.update_user_status(o.user_status);
    }
    SherdBookmarklet.runners[o.action](host_url,true);
} 

