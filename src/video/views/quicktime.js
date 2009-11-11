//status: porting
/*
  http://developer.apple.com/documentation/quicktime/Conceptual/QTScripting_JavaScript/bQTScripting_JavaScri_Document/QuickTimeandJavaScri.html#//apple_ref/doc/uid/TP40001526-CH001-SW7
  TODO: implement AssetView

  SERIALIZATION of asset
       {url:''
	,width:320
	,height:260
	,autoplay:'false'
	,controller:'true'
	,errortext:'Error text.'
	,type:'video/quicktime'
	};
  

*/
if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.QuickTime && Sherd.Video.Base) {
    Sherd.Video.QuickTime = function() {
	var self = this;
	Sherd.Base.AssetView.apply(this,arguments); //inherit
	Sherd.Video.Base.apply(this,arguments); //inherit
	
	this.supported = function(asset_obj) {
	    if (asset_obj.url) {
		return (/(rtsp:|\.mov$|\.mp4$|\.qtl$)/.test(asset_obj.url))?'quicktime':false;
	    }
	}
	///OVERRIDE  ??hack?
	this.html.remove = function(part) {
	    try {
		giveUp();//VITAL
	    }catch(e){alert(e);}
	    var par = self.components.wrapper.parentNode;
	    par.innerHTML = '';
	}
	this.html.put = function(dom,part) {
	    self.components = self.microformat.components(dom);
	    /*
	    if (part) {
	    } else {
		self.components['wrapper'] = dom;
		var media = dom.getElementsByTagName('object');
		if (media) {
		    self.components['media'] = media.item(0);
		}
	    }
            */
	}

	this.media = {};
	this.media._updateMovScale = function() {
	    if (!self.components.media) {
		///TODO:ASSUMING id() dependency for now
		self.components.media = self.microformat.components( false, {mediaID:self.id()} );
	    }
	    self.media.movscale = self.components.media.GetTimeScale();
	}
	this.media.time = function() {
	    self.media._updateMovScale();
	    return self.components.media.GetTime()/self.media.movscale;
	}
	this.media.duration = function() {
	    //TODO:test for loaded-ness
	    self.media._updateMovScale();
	    return self.components.media.GetDuration()/self.media.movscale;
	}
	this.media.timeCode = function() {
	    return self.secondsToCode(self.media.time());
	}

	this.media.play = function() {
	    self.events.queue('play',[
		{test:self.media._test,
		 poll:100
		},
		{call:function(){self.components.media.Play()}}
	    ]);
	}
	this.media.pause = function() {self.components.media.Stop();}
	this.media.pauseAt = function(endtime) {
	    this.media._endtime = endtime;
	}

	this.media._test = function() {
	    //are we ready?
	    if (typeof self.components.media == 'undefined') 
		throw "movie object does not exist";
	    var movie = self.components.media;
	    var status = movie.GetPluginStatus();
	    if (status != 'Playable' && status != 'Complete') 
		throw "not ready to play yet";
	    if (self.media.duration() >= 2147483647) 
		throw "invalid duration returned";
	    self.media._updateMovScale();
	    return true;
	}
	//returns true, if we're sure it is
	this.media.isStreaming = function() {
	    //2147483647 (=0x7FFFFFFF) 0x7FFFFFFF is quicktime's magic number for streaming.
	    var url = self.components.media.GetURL();
	    return (url && /^rtsp/.test(url));
	}
	this.media.seek = function(seconds,endtime) {
	    var playRate = 0;
	    if (endtime) {self.media.pauseAt(endtime);}
	    self.events.queue('seek',[
		{test:self.media._test,
		 poll:300
		},
		{check:self.media.isStreaming
		 ,test:function(streaming){//only for non-streaming
		     return (streaming //ASSUME: _test above got the movscale
			     ||seconds<=self.components.media.GetMaxTimeLoaded()/self.media.movscale);
		 }
		 ,poll:300
		},
		{call:function(){
		    playRate = parseInt(self.components.media.GetRate(),10);
		    //HACK: QT doesn't rebuffer if we don't stop-start
		    self.media.pause();
		    }//call
		},
		{check:function(){
		    self.media._updateMovScale();
		    //window.console.log(['movscale',seconds,self.media.movscale]);
		    self.components.media.SetTime(seconds*self.media.movscale);
		    self.components.media.SetRate(playRate);
		    return self.media.time();
		  }//check
		 ,test:function(t){return (t>=seconds)}
		 ,poll:300
		 ,timeout:2200//timeout to avoid seek competition
		}
	    ]);
	}
	this.media.timestrip = function() {
	    return {w:parseInt(self.components.media.width,10)-(16*5),
		    x:(16*2),
		    visible:true
		   };
	}

	function _default_QTformat() {
	    this.type = function() {return 'quicktime';};
	    this.read = function(found_obj) {
		//return asset object (with url:src, dimensions, etc)
		var obj = {
		    url:'',//defaults
		    quicktime:'',
		    width:320,
		    height:260,
		    autoplay:'false',
		    controller:'true',
		    errortext:'Error text.',
		    type:'video/quicktime',
		};
		var params = found_obj.html.getElementsByTagName('param');
		for (var i=0;i<params.length;i++) {
		    obj[params[i].getAttribute('name')] = params[i].getAttribute('value');
		}
		if (obj.src) {
		    obj.url = obj.src;
		    delete obj.src;
		} else {
		    obj.url = found_obj.html.getAttribute('data');
		}
		obj.quicktime = obj.url;
		if (Number(found_obj.html.width)) obj.width=Number(found_obj.html.width);
		if (Number(found_obj.html.height)) obj.height=Number(found_obj.html.height);
		return obj;
	    };
	    this.find = function(html_dom) {
		var found = [];
		//SNOBBY:not embeds, since they're in objects--and not xhtml 'n' stuff
		var objects = ((html_dom.tagName.toLowerCase()=='object')
			       ?[html_dom]
			       :html_dom.getElementsByTagName('object')
			       //function is case-insensitive in IE and FFox,at least
			      );
		for(var i=0;i<objects.length;i++) {
		    if (objects[i].getAttribute('classid')=='clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B'
			|| objects[i].getAttribute('type')=='video/quicktime'
		       )
			found.push({'html':objects[i]});
		}
		return found;
	    };
	    this.update = function(obj,html_dom) {
		///1. test if something exists in components now (else return false)
		///2. assert( obj ~= from_obj) (else return false)
		///3. 
		if (!obj.quicktime) {return false;}
		var compo = self.components || self.microformat.components(html_dom);
		if (compo && compo.media && compo.media != null) {
		    try {
			compo.media.SetURL(obj.quicktime);
			return true;
		    } catch(e) { /*alert(e.message);*/ }
		}
		return false;
	    };
	    this.write = function(create_obj,html_dom) {
		if (create_obj && create_obj.text) {
		    html_dom.innerHTML = create_obj.text;
		    var top = document.getElementById(create_obj.htmlID);
		    ///used to need this.  crazy, 'cause I sweated big time to make this doable here :-(
		    if (/Trident/.test(navigator.userAgent) && create_obj.object.autoplay=='true') {
			///again!  just for IE.  nice IE, gentle IE
			setTimeout(function() {
			    self.microformat.update(create_obj.object, top);
			},100);
		    }
		    self.components = self.microformat.components(top,create_obj);
		}
	    }
	    this.create = function(obj,doc) {
		var wrapperID = Sherd.Base.newID('quicktime-wrapper');
		var id = (typeof self.id=='function')?self.id():Sherd.Base.newID('quicktime');
		var opt = {
		    url:'',
		    width:320,
		    height:260,
		    autoplay:'false',
		    controller:'true',
		    errortext:'Error text.',
		    mimetype:'video/quicktime',
		    poster:false,
		    loadingposter:false,
		    extra:''
		};
		for (a in opt) {
		    if (obj[a]) opt[a] = obj[a];
		}
		opt.href= '';//for poster support
		opt.autohref= '';//for poster support
		if (!(/Macintosh.*[3-9][.0-9]+ Safari/.test(navigator.userAgent)
		     || /Linux/.test(navigator.userAgent)
		     )) {
		    if (opt.autoplay == 'true' && opt.loadingposter) {
			opt.mimetype = 'image/x-quicktime';
			opt.extra += '<param name="href" value="'+opt.url+'" /> \
		                      <param name="autohref" value="true" /> \
		                      <param name="target" value="myself" /> \
                                     ';
			opt.url = opt.poster;
			opt.controller = 'false';
		    } else if (opt.poster) {
			opt.mimetype = 'image/x-quicktime';
			opt.extra += '<param name="href" value="'+opt.url+'" /> \
		                      <param name="autohref" value="'+opt.autoplay+'" /> \
		                      <param name="target" value="myself" /> \
                                     ';
			opt.url = opt.poster;
			opt.controller = 'false';
		    }
		}
		//we need to retest where the href usecase is needed
		//since safari breaks
		return {htmlID:wrapperID,
			mediaID:id,
			currentTimeID:'currtime',
			durationID:'totalcliplength',
			clickToPlayID:'clicktoplay',
			object:obj,
			text:'<div id="'+wrapperID+'" class="sherd-quicktime-wrapper">\
                        <div id="currtime">00:00:00</div>/<div id="totalcliplength">00:00:00</div>\
	                <span id="clicktoplay" \
                              onclick="theMovie.SetURL(theMovie.GetHREF());hideElement(event.target)"\
                             >Click video to play</span>\
                        <!--[if IE]><object id="'+id+'" \
                         width="'+opt.width+'" height="'+opt.height+'" \
                         style="behavior:url(#qt_event_source)"  \
	                 codebase="http://www.apple.com/qtactivex/qtplugin.cab"  \
	                 classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B"> \
                        <[endif]--><!--[if !IE]><--><object id="'+id+'" type="'+opt.mimetype+'" \
	                            data="'+opt.url+'" \
	                            width="'+opt.width+'" height="'+opt.height+'">  \
                        <!-- ><![endif]--> \
     	                 <param name="src" value="'+opt.url+'" /> \
     	                 <!--param name="postdomevents" value="true" /--> \
	                 <param name="controller" value="'+opt.controller+'" /> \
     	                 <param name="type" value="'+opt.mimetype+'" /> \
	                 <param name="enablejavascript" value="true" /> \
	                 <param name="autoplay" value="'+opt.autoplay+'" /> \
	                 '+opt.extra+'\
	                 '+opt.errortext+'</object></div>'
			/*
			'<!--[if IE]><object id="'+id+'" \
                         width="'+opt.width+'" height="'+opt.height+'" \
                         style="behavior:url(#qt_event_source)"  \
	                 codebase="http://www.apple.com/qtactivex/qtplugin.cab"  \
	                 classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B"> \
     	                 <param name="src" value="'+opt.url+'" /> \
                        <[endif]--><!--[if !IE]><--><object id="'+id+'" type="'+opt.type+'" \
	                            data="'+opt.url+'" \
	                            width="'+opt.width+'" height="'+opt.height+'">  \
                        <!-- ><![endif]--> \
     	                 <!--param name="postdomevents" value="true" /--> \
     	                 <param name="type" value="'+opt.type+'" /> \
	                 <param name="autoplay" value="'+opt.autoplay+'" /> \
	                 <!-- param name="autohref" value="true" /--> \
	                 <!-- param name="href" value="'+opt.url+'" / --> \
	                 <param name="controller" value="'+opt.controller+'" /> \
	                 '+opt.errortext+'</object>'*/
		       };
	    };
	    this.components = function(html_dom,create_obj) {
		try {
		    var rv = {};
		    if (html_dom) {
			rv.wrapper = html_dom;
		    }
		    if (create_obj) {
			//the first works for everyone except safari
			//the latter probably works everywhere except IE
			rv.media = document[create_obj.mediaID] || document.getElementById(create_obj.mediaID);
		    } else if (html_dom) {
			var media = html_dom.getElementsByTagName('object');
			if (media.length) {
			    rv.media = media.item(0);
			}
		    }
		    return rv;
		} catch(e) {}
		return false;
	    };
	}
	this.attachMicroformat(new _default_QTformat());
    }//Sherd.AssetViews.QuickTime
}
/*
			var args = ['images/poster.gif',
			  '320', '256', '',
			  'name','movie1',
			  'href','$!{material.url}',
			  'target','myself',
			  'type','image/x-quicktime',
			  'bgcolor','#ffffff',
			  'enablejavascript','true',
			  'controller','false',
			  'autoplay','true',
			  'autohref','true',
			  'kioskmode','true',
			  'pluginspage','http://www.apple.com/quicktime/download/',
			  'classid','clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B',
			  'codebase','http://www.apple.com/qtactivex/qtplugin.cab'];
			///Safari 3: does not do autohref successfully. why does it suck?
			if (/Macintosh.*3[.0-9]+ Safari/.test(navigator.userAgent)) {
			   args[0] = args[7];
			   args[11] = 'video/quicktime'; //type
			   args[17] = 'true'; //controller = true
			   args[21] = 'false'; //autohref=false
			   args.splice(6,2); //remove href
			}
			QT_WriteOBJECT_XHTML.apply(this,args);
*/