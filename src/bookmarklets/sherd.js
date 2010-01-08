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
           }
};

var hosthandler = {
    "youtube.com": {
        find:function() {
        },
        decorate:function(objs) {
        }
    },
    "vietnamwararchive.ccnmtl.columbia.edu": {
        find:function() {
            if (document.location.pathname.search("/record/display") != 0) 
                return [];
            return [ vietnam_update() ];
        },
        decorate:function(objs) {
        },
        update:vietnam_update
    },
    "digitaltibet.ccnmtl.columbia.edu": {
        find:function() {
            var real_site = "http://digitaltibet.ccnmtl.columbia.edu/";
            var img = jQuery(".node img").get(0);
            if (!img || document.location.pathname.search("/image/") != 0) 
                return [];            

	    var img_file = String(img.src);
	    var decontextualized_image = document.createElement("img");
	    decontextualized_image.src = img_file;
	    
	    var img_base = img_file.match(/images\/([^.]+)\./)[1];
	    var site_base = String(document.location).match(/(.*?)image/)[1];
	    var extension = img_file.substr(-3); /*JPG or jpg--CRAZY!!!*/
	    var sources = {
	            "title":jQuery("#node-main h2.title").get(0).innerHTML,
	            "thumb":site_base+"files/tibet/images/"+img_base+".thumbnail."+extension,
	            "xyztile":real_site+"files/tibet/images/tiles/"+img_base+"/z${z}/y${y}/x${x}.png",
	            "image":img_file,
	            "archive":site_base,
	            "image-metadata":"w"+decontextualized_image.width+"h"+decontextualized_image.height,
	            "xyztile-metadata":"w"+img.width+"h"+img.height
	    };
            console.log(sources);
            return [ {html:img, sources:sources} ];
        },
        decorate:function(objs) {
        }
    },
    "thlib.org": {
        /*e.g. http://www.thlib.org/places/monasteries/meru-nyingpa/murals/ */
        find:function() {
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
        var assets = handler.find();
        console.log(assets);
        console.log(jump_now);
        if (assets.length == 1 && jump_now) {
            console.log(obj2url(mondrian_url, assets[0]));
            document.location = obj2url(mondrian_url, assets[0]);
        }
    },
    decorate: function(mondrian_url) {

    }
};

if (typeof mondrian_url == "string" && typeof mondrian_action == "string") {
    runners[mondrian_action](mondrian_url,true);
}
