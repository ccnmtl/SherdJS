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
      for (a in user_status) {
          window.SherdBookmarklet.user_status[a] = user_status[a];
      }
      //find assets again, so obj2form can include metadata
      //if (!uninit && user_status.ready && SherdBookmarklet.g) {
      //SherdBookmarklet.g.findAssets();
      //}
  },
  "hosthandler": {
    /*Try to keep them ALPHABETICAL by 'brand' */
    "library.artstor.org": {
        find:function(callback) {
            /*must have floating pane open to find image*/
            SherdBookmarklet.run_with_jquery(function _find(jQuery) {
                var floating_pane = jQuery(".MetaDataWidgetRoot");
                if (!floating_pane.length) {
                    return callback([],"Try opening the image information pane by clicking its title under the thumbnail.");
                } else {
                    var obj = {
                        "sources":{},
                        "html":floating_pane.get(0),
                        "metadata":{},
                        "primary_type":'image_fpx'
                    };
                    var objectId = obj.html.id.substr(3);/*after 'mdw'*/
                    var done = 2; //# of queries
                    function obj_final() {
                        return callback([obj]);
                    }
                    jQuery
                    .ajax({url:"http://library.artstor.org/library/secure/imagefpx/"+objectId+"/103/5",
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
                    .ajax({url:"http://library.artstor.org/library/secure/metadata/"+objectId,
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
            });
        }
    },
    "flickr.com": {
        find:function(callback) {
            SherdBookmarklet.run_with_jquery(function(jQuery) { 
                var apikey = SherdBookmarklet.options.flickr_apikey;
                if (!apikey) 
                    return callback([]);

                var bits = document.location.pathname.split("/");//expected:/photos/userid/imageid/
                var imageId = bits[3];

                if (imageId.length < 1 || imageId.search(/\d{1,12}/) < 0)
                    return callback([]);

                /* http://docs.jquery.com/Release:jQuery_1.2/Ajax#Cross-Domain_getJSON_.28using_JSONP.29 */
                var baseUrl = "http://api.flickr.com/services/rest/?jsoncallback=?&format=json&api_key="+apikey+"&photo_id="+imageId;

                jQuery.getJSON(baseUrl + "&method=flickr.photos.getInfo",
                    function(getInfoData) {
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
                                    if (item.width > w) {
                                        w = item.width;
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
                           });
                    });
            });
        },
        decorate:function(objs) {
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
                    /*do a query to see what the full dimensions are of the tiles
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
            var video = document.getElementById("movie_player");
            if (video && video != null) {
                function getTitle(VIDEO_ID) {
                    var raw_title = '';
                    function cleanTitle(str) {
                        return str.replace(/<SPAN[^>]*>/,'').replace('</SPAN>','').replace(/^\s*/,"").replace(/\s*$/,"");
                    }
                    if (/www.youtube.com\/watch/.test(document.location)) {
                        raw_title = (document.getElementsByTagName("h1")[0].textContent
                                     || document.getElementsByTagName("h1")[0].innerHTML);
                    } else {
                        var for_channels = document.getElementById("playnav-curvideo-title");
                        if (for_channels != null) {
                            raw_title = (document.getElementById("playnav-curvideo-title").textContent
                                         || document.getElementById("playnav-curvideo-title").innerHTML);
                        }
                    }
                    return cleanTitle(raw_title);
                }
                function getThumb(VIDEO_ID) {
                    var tries = [/*last-first*/
                        [document.getElementById("playnav-video-play-uploads-0-"+VIDEO_ID)],
                        goog.dom.getElementsByTagNameAndClass("div","playnav-item-selected"),
                        goog.dom.getElementsByTagNameAndClass("div","watch-playlist-row-playing")
                    ]; var i=tries.length;
                    while (--i >= 0) {
                        if (tries[i].length && tries[i][0] != null) {
                            return tries[i][0].getElementsByTagName("img")[0].src;
                        }
                    }
                    var try_embed = video.getAttribute('flashvars').match(/thumbnailUrl=([^&?]*)/);
                    if (try_embed) {
                        return unescape(try_embed[1]);
                    }
                    return undefined;
                }
                var VIDEO_ID = video.getVideoUrl().match(/[?&]v=([^&]*)/)[1];
                video.pauseVideo();
                var obj = {
                    "html":video,
                    "hash":"start="+video.getCurrentTime(),
                    "disabled":video.getVideoEmbedCode() == "",
                    "primary_type":'youtube',
                    "sources":{
                        "title":getTitle(VIDEO_ID),
                        "thumb":getThumb(VIDEO_ID),
                        "url":"http://www.youtube.com/watch?v="+VIDEO_ID,
                        "youtube":"http://www.youtube.com/v/"+VIDEO_ID+"?enablejsapi=1&fs=1",
                        "gdata":"http://gdata.youtube.com/feeds/api/videos/"+VIDEO_ID
                    }
                };
                if (video.getCurrentTime() == video.getDuration()) 
                    delete obj.hash;
                
                return callback([obj]);

            } else callback([]);
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
                      var yt_callback = 'sherd_youtube_callback_'+index;
                      window[yt_callback] = function(yt_data) {
                          var e = yt_data['entry'];
                          rv.sources['title'] = e.title['$t'];
                          var th = e['media$group']['media$thumbnail'][0];
                          rv.sources['thumb'] = th.url;
                          rv.sources['thumb-metadata'] = "w"+th.width+"h"+th.height;
                          
                          rv.metadata = {
                              'description':[e.content['$t']],
                              'author':[e.author[0].name],
                              'author_uri':[e.author[0].uri],
                              'youtube_link':['http://www.youtube.com/watch?v='+VIDEO_ID]
                          };
                          if (e['media$group']['media$category'].length) {
                              rv.metadata['category'] = [e['media$group']['media$category'][0].label];
                          }
                          optional_callback(index, rv);
                      }
                      jQ.ajax({
                          url: rv.sources.gdata+'?v=2&alt=json-in-script&callback='+yt_callback,
                          dataType: 'script',
                          error:function(){optional_callback(index);}
                      });
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
                              var url = (typeof p=='string') ? p : p.url;
                              if (/\.(jpg|jpeg|png|gif)/.test(url)) {
                                  //redundant urls wasteful, but useful
                                  sources.image = url;
                                  sources.thumb = url;
                                  sources.poster = url;
                                  if (p.width) {
                                      sources['image-metadata'] = "w"+p.width+"h"+p.height;
                                  }
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
                      function get_provider(c) {
                          if (c.provider && cfg.plugins[c.provider]) {
                              var plugin = cfg.plugins[c.provider].url;
                              if (/pseudostreaming/.test(plugin)) {
                                  return '_pseudo';
                              } else if (/rtmp/.test(plugin)) {
                                  return '_rtmp';
                              }
                          } 
                          return '';
                      }
                      var primary_type = type+get_provider(clip);
                      sources[primary_type] = clip.originalUrl || clip.url || clip;
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
                              || String(objemb.src).match(/\.mov$/) != null
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
                                  "quicktime":abs(src, context.document)
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
              for (var i=0;i<videos.length;i++) {
		  var src = videos[i].src;
                  result.push({
                      "html":videos[i],
                      "primary_type":"ogg",
		      "label": "video",
                      "sources": {
                          "ogg":src,
                          "ogg-metadata":"w"+videos[i].width+"h"+videos[i].height
                      }
                  });
              }
              callback(result);
          }
      },/* end image assethandler */
      "image": {
          find:function(callback,context) {
              var imgs = context.document.getElementsByTagName("img");
              var result = [];
              for (var i=0;i<imgs.length;i++) {
                  //IGNORE headers/footers/logos
                  var image = imgs[i];
                  if (/(footer|header)/.test(image.className)
                      ||/site_title/.test(image.parentNode.parentNode.className)//WGBH header
                      ||/logo/.test(image.id) //drupal logo
                      ||/logo\W/.test(image.src) //web.mit.edu/shakespeare/asia/
                     ) continue;
                  /*use offsetWidth, so display:none's are excluded */
                  if (image.offsetWidth > 400 || image.offsetHeight > 400) {
                      result.push({
                          "html":image,
                          "primary_type":"image",
                          "sources": {
                              "title":image.title || undefined,
                              "image":image.src,
                              "image-metadata":"w"+image.width+"h"+image.height
                          }
                      });
                  }
              }
              callback(result);
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
      if (document.location.hostname in hosthandler) {
          return hosthandler[document.location.hostname];
      } else if (document.location.hostname.slice(4) in hosthandler) {
          /*for www. domains */
          return hosthandler[document.location.hostname.slice(4)];
      }
  },/*gethosthandler*/
  "obj2url": function(host_url,obj) {
    /*excluding metadata because too short for GET string*/
    if (!obj.sources["url"]) obj.sources["url"] = document.location;
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
  "obj2form": function(host_url,obj,doc) {
      doc = doc||document;
      if (!obj.sources["url"]) obj.sources["url"] = doc.location;
      var destination =  host_url;
      if (obj.hash) {
          destination += "#"+obj.hash;
      }
      var form = doc.createElement("form");
      form.innerHTML = '<span></span><div class="">Type: '
          +(obj.label||obj.primary_type||'Unknown')
          +'</div>';
      form.action = destination;
      form.target = '_top';
      var ready = window.SherdBookmarklet.user_ready();
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
            M.g = new M.Grabber(host_url);
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
            }
            if (window.console) {/*if we get here, we're debugging*/
                window.console.log(assets);
            }
        };
        handler.find.call(handler, jump_with_first_asset);
    },
    decorate: function(host_url) {
        var M = SherdBookmarklet;
        function go(run_func) {
            M.run_with_jquery(function() {
                M.g = new M.Grabber(host_url);
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
  "Grabber" : function (host_url, page_handler, options) {
      this.hasBody = function(doc) {
          return ('body'==doc.body.tagName.toLowerCase());
      }
      this.options = {
          tab_label:"Analyze in Mediathread",
          target:((this.hasBody(document))? document.body : null),
          top:100,
          side:"left",
          fixed:true,
          no_assets_message:'Sorry, no supported assets were found on this page. Try going to an asset page if you are on a list/search page.'
      }; if (options) for (a in options) {this.options[a]=options[a]};
      var jQ = (window.SherdBookmarkletOptions.jQuery ||window.jQuery );

      var o = this.options;
      var M = SherdBookmarklet;
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
              comp.ul.innerHTML = "";
          }
      };
      this.setupContent = function(target) {
          comp.top = target.ownerDocument.createElement("div");
          comp.top.setAttribute("class","sherd-analyzer");
          target.appendChild(comp.top);
          var pageYOffset = self.visibleY(target)+o.top;

          comp.top.innerHTML = "<div class=\"sherd-tab\" style=\"display:block;position:absolute;"+o.side+":0px;z-index:9998;height:2.5em;top:"+pageYOffset+"px;color:black;font-weight:bold;margin:0;padding:5px;border:3px solid black;text-align:center;background-color:#cccccc;text-decoration:underline;cursor:pointer;text-align:left;\">"+o.tab_label+"</div><div class=\"sherd-window\" style=\"display:none;position:absolute;z-index:9999;top:0;width:400px;height:400px;overflow:hidden;border:3px solid black;text-align:left;background-color:#cccccc\"><div class=\"sherd-window-inner\" style=\"overflow-y:auto;width:384px;height:390px;margin:1px;padding:0 6px 6px 6px;border:1px solid black;\"><button class=\"sherd-close\" style=\"float:right;\">close</button><button class=\"sherd-move\" style=\"float:right;\">move</button><h2>Choose an asset to import for analysis</h2><p class=\"sherd-message\">Searching for assets....</p><ul></ul></div></div>";
          comp.tab = comp.top.firstChild;
          comp.window = comp.top.lastChild;
          comp.ul = comp.top.getElementsByTagName("ul")[0];
          comp.close = comp.top.getElementsByTagName("button")[0];
          comp.move = comp.top.getElementsByTagName("button")[1];
          comp.message = comp.top.getElementsByTagName("p")[0];
          M.connect(comp.tab, "click", this.onclick);
          M.connect(comp.move, "click", function(evt) {
              var s = comp.window.style;
              s.left = s.right = null;
              //s.top = s.bottom = null;
              s.right = '0px';
              //s.top = '0px';
          });
          M.connect(comp.close, "click", function(evt) {
              comp.ul.innerHTML = "";
              comp.window.style.display = "none";
              comp.tab.style.display = "block";
              self.windowStatus = false;
          });
      };
      if (o.target) {
          this.setupContent(o.target);
      }

      this.handler_count = 0;
      this.final_count = 0;
      this.assets_found = [];
      this.page_resource_count = 0;
      this.findAssets = function() {
          self.showWindow();
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
          if (!comp.window && frames.best) {
              var target = o.target || frames.best.document.body;
              self.setupContent(target);
              self.showWindow();
          }
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
                  jQ('#'+merge_with.html_id).remove();
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
          Array.prototype.push.apply(self.assets_found,assets);
          for (var i=0;i<assets.length;i++) {
              self.no_assets_yet = false;
              if (assets[i].page_resource) ++self.page_resource_count;
              self.displayAsset(self.mergeRedundant(assets[i]));
          }
          ++self.handler_count;
          if (self.handler_count >= self.final_count) {
              self.finishedCollecting();
          }
      };
      this.displayAsset = function(asset) {
          if (!asset) return;
          asset.html_id = self.assetHtmlID(asset);
          var doc = comp.ul.ownerDocument;
          var li = doc.createElement("li");
          var jump_url = M.obj2url(host_url, asset);
          var form = M.obj2form(host_url, asset, doc);
          li.id = asset.html_id;
          li.appendChild(form);
          li.style.listStyleType = 'none';
          li.style.padding = '4px';
          li.style.margin = '4px';
          li.style.border = '1px solid black';
          jQ('input.sherd-form-title',form).prev().html("<div><label for='title'>Title:</label></div>");

          var img = asset.sources.thumb || asset.sources.image;
          if (img) {
              form.firstChild.innerHTML = "<img src=\""+img+"\" style=\"width:20%;max-width:120px;max-height:120px;\" /> ";
          }
          form.lastChild.innerHTML = "<input type=\"submit\"  style=\"display:block;padding:4px;margin:4px;\" value=\"analyze\" />";

          if (comp.ul) {
              if (comp.ul.firstChild != null 
                  && comp.ul.firstChild.innerHTML == o.no_assets_message) {
                  jQ(comp.ul.firstChild).remove();
              }
              comp.ul.appendChild(li);
          }
      };
      this.finishedCollecting = function() {
          if (comp.message) {
              comp.message.innerHTML = "";/*erase searching message*/
              if (self.no_assets_yet) {
                  comp.ul.innerHTML = "<li>"+o.no_assets_message+"</li>";
              }
          }
      };
      this.walkFrames = function() {
          var rv = {all:[]}
          rv.all.unshift({frame:window, 
                          document:document,
                          window:window,
                          hasBody:self.hasBody(document)});
          var max =(rv.all[0].hasBody *document.body.offsetWidth *document.body.offsetHeight) || 0;
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

  }/*Grabber*/
};/*SherdBookmarklet (root)*/

window.MondrianBookmarklet = SherdBookmarklet; //legacy name
if (!window.SherdBookmarkletOptions) {
    window.SherdBookmarkletOptions = {};
}

if (!SherdBookmarkletOptions.decorate) {
    var o = SherdBookmarkletOptions;
    var host_url = o.host_url || o.mondrian_url;//legacy name
    SherdBookmarklet.options = o;
    SherdBookmarklet.debug = o.debug;
    if (o.user_status) {
        SherdBookmarklet.update_user_status(o.user_status);
    }
    SherdBookmarklet.runners[o.action](host_url,true);
} else {
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
}
