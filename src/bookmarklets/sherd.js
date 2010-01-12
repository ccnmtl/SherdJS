/*RULES
  1. NO single quote characters
  2. NO // comments
*/
var vietnam_update = function(obj) {
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
};

var hosthandler = {
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
                var VIDEO_ID = video.getVideoUrl().match(/\?v=([^&]*)&/)[1];
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
        find:function(callback) {
            var rv = [];
            if (document.location.pathname.search("/record/display") == 0) 
                rv = [ vietnam_update() ];
            callback(rv);
        },
        decorate:function(objs) {
        },
        update:vietnam_update
    },
    "digitaltibet.ccnmtl.columbia.edu": {
        find:function(callback) {
            var real_site = "http://digitaltibet.ccnmtl.columbia.edu/";
            var img = jQuery(".node img").get(0);
            if (!img || document.location.pathname.search("/image/") != 0) 
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
};


var gethosthandler = function() {
    if (document.location.hostname in hosthandler) {
        return hosthandler[document.location.hostname];
    } else if (document.location.hostname.slice(4) in hosthandler) {
        return hosthandler[document.location.hostname.slice(4)];
    }
};

var obj2url = function(mondrian_url,obj) {
    if (!obj.sources["url"]) obj.sources["url"] = document.location;
    var destination =  mondrian_url;
    for (a in obj.sources) {
	destination += ( a+"="+escape(obj.sources[a]) +"&" );
    }
    if (obj.hash) {
        destination += "#"+obj.hash;
    }
    return destination;
};

var runners = {
    jump: function(mondrian_url,jump_now) {
        var final_url = mondrian_url;
        var handler = gethosthandler();
        if (!handler) {
            alert("Sorry, this website is not supported.");
            return;
        }
        var my_callback = function(assets) {
            switch (assets.length) {
            case 0: 
                return alert("This page does not contain an asset. Try going to an asset page.");
            case 1:
                if (jump_now) {
                    document.location = obj2url(mondrian_url, assets[0]);
                }
            }
        };
        var assets = handler.find.call(handler, my_callback);
    },
    decorate: function(mondrian_url) {

    }
};

if (typeof mondrian_url == "string" && typeof mondrian_action == "string") {
    runners[mondrian_action](mondrian_url,true);
}
