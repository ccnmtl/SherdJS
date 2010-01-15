/*RULES
  1. NO single quote characters
  2. NO // comments
*/
MondrianBookmarklet = {
  "hosthandler": {
    "youtube.com": {
        find:function(callback) {
            var video = document.getElementById("movie_player");
            if (video && video != null) {
                function getTitle() {
                    if (/www.youtube.com\/watch/.test(document.location)) {
                        return document.getElementsByTagName("h1")[0].innerHTML;
                    } else {
                        var for_channels = document.getElementById("playnav-curvideo-title");
                        if (for_channels != null) {
                            return document.getElementById("playnav-curvideo-title")
                            .textContent.replace(/^\s*/,"").replace(/\s*$/,"");
                        }
                    }
                }
                var VIDEO_ID = video.getVideoUrl().match(/[?&]v=([^&]*)/)[1];
                video.pauseVideo();
                var obj = {
                    "html":video,
                    "hash":"start="+video.getCurrentTime(),
                    "sources":{
                        "title":getTitle(),
                        "url":"http://www.youtube.com/watch?v="+VIDEO_ID,
                        "youtube":"http://www.youtube.com/v/"+VIDEO_ID+"?enablejsapi=1&fs=1"
                    }
                };
                if (video.getCurrentTime() == video.getDuration()) 
                    delete obj.hash;
                return callback([obj]);

            } else callback([]);
        },
        decorate:function(objs) {
        }
    },
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
                try{
                    e.Stop();
                    hash = "start="+Math.floor(e.GetTime()/e.GetTimeScale());
                } finally{}
            }
            return {"html":$(".media").get(0),
                    "hash": hash||undefined,
                    "sources":{
                        "title":document.title,
                        "quicktime":$(".media").media("api").options.src,
                        "poster":$(".media img").get(0).src
                        /*,"thumb": XXXX */
                    }
                   };
        }
    },
    "digitaltibet.ccnmtl.columbia.edu": {
        single:function() {
            return (document.location.pathname.search("/image/") == 0);
        },
        find:function(callback) {
            var real_site = "http://digitaltibet.ccnmtl.columbia.edu/";
            var img = jQuery(".node img").get(0);
            if (!img || !this.single()) 
                return callback([]);            

            var images = ImageAnnotator.images[0].imager.images; /*annotationfield*/
            var max_image = images[images.length-1];
	    var img_base = max_image.src.match(/images\/([^.]+)\./)[1];
	    var site_base = String(document.location).match(/(.*?)image/)[1];
	    var extension = max_image.src.substr(-3); /*JPG or jpg--CRAZY!!!*/
	    var sources = {
	            "title":jQuery("#node-main h2.title").get(0).innerHTML,
	            "thumb":site_base+"files/tibet/images/"+img_base+".thumbnail."+extension,
	            "xyztile":real_site+"files/tibet/images/tiles/"+img_base+"/z${z}/y${y}/x${x}.png",
	            "image":max_image.src,
	            "archive":site_base,
	            "image-metadata":"w"+max_image.width+"h"+max_image.height,
	            "xyztile-metadata":"w"+max_image.width+"h"+max_image.height
	    };
            callback( [ {html:img, sources:sources} ] );
        },
        decorate:function(objs) {
        }
    },
    "thlib.org": {
        /*e.g. those on http://www.thlib.org/places/monasteries/meru-nyingpa/murals/ */
        find:function(callback) {
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
                                "sources": sources
                               } ]);
                },"text");
            } else callback([]);
        },
        decorate:function(objs) {
        }
    }
  },/*hosthandler*/
  "assethandler":{
      "embeds": {
          players:{
              "youtube":{
                  match:function(emb) {
                      return String(emb.src).match(/^http:\/\/www.youtube.com\/v\/([\w-]*)/);
                  },
                  object:function(emb,match) {
                      /*use http://gdata.youtube.com/feeds/api/videos/?q=KP-nVpOLW88&v=2&alt=json-in-script&callback=myFunction
                        so we need to pass in the callback stuff here.
                        http://code.google.com/apis/youtube/2.0/reference.html#Searching_for_videos
                       */
                      return {
                      };
                  }
              }
          },
          find:function(callback) {
              var result = [];
              var embeds = document.getElementsByTagName("embed");
              for (var i=0;i<embeds.length;i++) {
                  var emb = embeds[i];
                  for (p in this.players) {
                      var m = this.players[p].match(emb);
                      if (m != null) {
                          result.push({html:emb,
                                       sources:this.players[p].object(emb,m)
                                      });
                          break;
                      }
                  }
              }
              callback(result);
          }
      },
      "image": {
          find:function(callback) {
              var imgs = document.getElementsByTagName("img");
              var result = [];
              for (var i=0;i<imgs.length;i++) {
                  if (imgs[i].width > 400 || imgs[i].height > 400) {
                      result.push({
                          "html":imgs[i],
                          "sources": {
                              "title":imgs[i].title || imgs[i].src,
                              "image":imgs[i].src,
                              "image-metadata":"w"+imgs[i].width+"h"+imgs[i].height,
                          }
                      });
                  }
              }
              callback(result);
          }
      },
      "mondrian": {
          find:function(callback) {
              var result = [];
              if (String(document.body.innerHTML).indexOf("asset-links") < 0 ) {
                  return callback(result);/*quick fail*/
              }
              var M = MondrianBookmarklet;
              var divs = document.getElementsByTagName("div");
              for (var i=0;i<divs.length;i++) {
                  if (M.hasClass(divs[i]," asset-links ")) {
                      var sources = {};
                      var src_elems = divs[i].getElementsByTagName("a");
                      for (var j=0;j<src_elems.length;j++) {
                          if (M.hasClass(src_elems[j]," assetsource ")) {
                              var src = src_elems[j];
                              var reg = String(src.getAttribute("class")).match(/assetlabel-(\w+)/);
                              if (reg != null) {
                                  /*use getAttribute rather than href, to avoid urlencodings*/
                                  sources[reg[1]] = src.getAttribute("href");
                                  if (src.title) 
                                      sources.title = src.title;
                              }
                          }
                      }
                      result.push({
                          html:divs[i],
                          sources:sources
                      });
                  }
              }
              return callback(result);
          }
      }
  },/*assethandler*/
  "gethosthandler":function() {
      var hosthandler = MondrianBookmarklet.hosthandler;
      if (document.location.hostname in hosthandler) {
          return hosthandler[document.location.hostname];
      } else if (document.location.hostname.slice(4) in hosthandler) {
          return hosthandler[document.location.hostname.slice(4)];
      }
  },/*gethosthandler*/
  "obj2url": function(mondrian_url,obj) {
    if (!obj.sources["url"]) obj.sources["url"] = document.location;
    var destination =  mondrian_url;
    for (a in obj.sources) {
	destination += ( a+"="+escape(obj.sources[a]) +"&" );
    }
    if (obj.hash) {
        destination += "#"+obj.hash;
    }
    return destination;
  },/*obj2url*/
  "runners": {
    jump: function(mondrian_url,jump_now) {
        var final_url = mondrian_url;
        var handler = MondrianBookmarklet.gethosthandler();
        if (!handler) {
            alert("Sorry, this website is not supported.");
            return;
        }
        var jump_with_first_asset = function(assets) {
            switch (assets.length) {
            case 0: 
                return alert("This page does not contain an asset. Try going to an asset page.");
            case 1:
                if (jump_now) {
                    document.location = MondrianBookmarklet.obj2url(mondrian_url, assets[0]);
                }
            }
        };
        handler.find.call(handler, jump_with_first_asset);
    },
    decorate: function(mondrian_url) {
        var M = MondrianBookmarklet;
        function go() {
            M.g = new M.Grabber(mondrian_url);
        }
        M.l = M.connect(window,"load",go);
    }
  },/*runners*/
  "connect":function (dom,event,func) {
      return ((dom.addEventListener)? dom.addEventListener(event,func,false) : dom.attachEvent("on"+event,func));
  },/*connect*/
  "hasClass":function (elem,cls) {
      return (" " + (elem.className || elem.getAttribute("class")) + " ").indexOf(cls) > -1;
  },
  "Grabber" : function (mondrian_url, page_handler, options) {
      this.options = {
          tab_label:"Analyze in Mondrian",
          target:document.body,
          top:"100px",
          side:"left",
          fixed:true
      }; if (options) for (a in options) {this.options[a]=options[a]};
      var o = this.options;
      var M = MondrianBookmarklet;
      var self = this;
      var comp = this.components = {};
      comp.top = document.createElement("div");
      comp.top.setAttribute("class","sherd-analyzer");
      this.options.target.appendChild(comp.top);
      comp.top.innerHTML = "<div class=\"sherd-tab\" style=\"display:block;position:absolute;"+o.side+":0px;z-index:9998;height:2.5em;top:"+o.top+";color:black;font-weight:bold;margin:0;padding:5px;border:3px solid black;text-align:center;background-color:#cccccc;text-decoration:underline;cursor:pointer;\">"+o.tab_label+"</div><div class=\"sherd-window\" style=\"display:none;position:absolute;z-index:9999;top:0;width:400px;height:400px;overflow:hidden;border:3px solid black;background-color:#cccccc\"><div class=\"sherd-window-inner\" style=\"overflow-y:auto;width:384px;height:390px;margin:1px;padding:0 6px 6px 6px;border:1px solid black;\"><button class=\"sherd-close\" style=\"float:right;\">close</button><h2>Assets on this Page</h2><p class=\"sherd-message\">Searching for assets....</p><ul></ul></div></div>";
      comp.tab = comp.top.firstChild;
      comp.window = comp.top.lastChild;
      comp.ul = comp.top.getElementsByTagName("ul")[0];
      comp.close = comp.top.getElementsByTagName("button")[0];
      comp.message = comp.top.getElementsByTagName("p")[0];
      this.onclick = function(evt) {
          if (self.windowStatus) return;
          self.windowStatus = true;
          comp.window.style.display = "block";
          comp.tab.style.display = "none";
          self.findAssets();
      };
      M.connect(comp.tab, "click", this.onclick);
      M.connect(comp.close, "click", function(evt) {
          comp.window.style.display = "none";
          comp.tab.style.display = "block";
          self.windowStatus = false;
      });
      this.handler_count = 1;
      this.assets_found = [];
      this.findAssets = function() {
          comp.ul.innerHTML = "";
          var handler = MondrianBookmarklet.gethosthandler();
          if (handler) {
              handler.find.call(handler, self.collectAssets);
          } else {
              handler = MondrianBookmarklet.assethandler;
              for (h in MondrianBookmarklet.assethandler) {
                  ++self.handler_count;
                  handler[h].find.call(handler,self.collectAssets);
              }
              --self.handler_count;/*go to zero*/
          }
      };
      this.collectAssets = function(assets) {
          self.assets_found.push.apply(self.assets_found,assets);
          --self.handler_count;
          for (var i=0;i<assets.length;i++) {
              self.displayAsset(assets[i]);
          }
          if (self.handler_count==0) {
              self.finishedCollecting();
          }
      };
      this.displayAsset = function(asset) {
          var li = document.createElement("li");
          var jump_url = M.obj2url(mondrian_url, asset);
          var inner = asset.sources.title;
          var img = asset.sources.thumb || asset.sources.image;
          if (img) {
              inner = "<img src=\""+img+"\" height=\"60px\" style=\"max-width:100px\" /> "+inner;
          }
          li.innerHTML = "<a href=\""+jump_url+"\">"+inner+"</a>";
          comp.ul.appendChild(li);
      };
      this.finishedCollecting = function() {
          comp.message.innerHTML = "";/*erase searching message*/
          if (self.assets_found.length ==0) {
              comp.ul.innerHTML = "<li>Sorry, no supported assets were found on this page. Try going to an asset page if you are on a list/search page.</li>";
          }
      };

  }/*Grabber*/
};/*MondrianBookmarklet (root)*/


if (typeof mondrian_url == "string" && typeof mondrian_action == "string") {
    MondrianBookmarklet.runners[mondrian_action](mondrian_url,true);
} else {
    var scripts = document.getElementsByTagName("script");
    var me_embedded = scripts[scripts.length-1];
    mondrian_url = String(me_embedded.src).split("/",3).join("/")+"/save/?";
    mondrian_action = "decorate";
    MondrianBookmarklet.runners[mondrian_action](mondrian_url,true);
}
