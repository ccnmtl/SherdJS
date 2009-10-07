/*RULES:
  1. all comments must be in /* blocks.  NO //'s
  2. NO single quotes!!! like this: '  except in block comments
*/
(function(){
    if (document.getElementById("sherdvideobookmarkletrun"))
	return;var sh=document.createElement("div");
    sh.setAttribute("style","display:none");
    sh.id="sherdvideobookmarkletrun";
    document.documentElement.appendChild(sh);
    var flash=function(d,t){
	var b=d.style.backgroundColor;setTimeout(
	    function(){
		d.style.background="red";
	    },t);
	setTimeout(
	    function(){d.style.background=b;},
	    t+250);
    };
    var notobj=function(d,all){
	var h1s=document.getElementsByTagName("h1");
	if(!all.length&&h1s.length) return h1s[0];
	while(/object/i.test(d.parentNode.tagName)){
	    d=d.parentNode;
	}
	return d.parentNode;
    };
    var x=function(dom,key,uri,title,hash){
	var a=document.createElement("a");
	dom.appendChild(a);
	a.href="{{request.build_absolute_uri}}?url="+escape(document.location)+"&title="+escape(title)+"&"+key+"="+escape(uri);
	if (hash) a.href+="#"+hash;
	a.innerHTML="Add to my Sherd Space";
	a.setAttribute("style","padding:2px 2px 2px 20px;font-weight:bold;background-color:white;z-index:9999;position:relative;border:2px solid black;");
	flash(a,0);
	flash(a,500);
    };
    var embs=document.getElementsByTagName("embed");
    for(var i=0;embs.length>i;i++){
	var e=embs[i];
	/*quicktime*/
	if (/quicktime/.test(e.getAttribute("pluginspage"))){
	    var start = 0;
	    try{e.Stop();start="start="+Math.floor(e.GetTime()/e.GetTimeScale());}
	    finally{x(notobj(e,embs),"quicktime",e.src,document.title+i,start);}
	}
	/*YouTube*/
	if (/http:\/\/www\.youtube\.com/.test(e.src)){
	    x(notobj(e,embs),"youtube",e.src,document.title+i);
	}
    };
    if (!embs.length) {
	/*WGBH*/
	if( $ && $(".media").media) {
	    x($("h1").get(0),"quicktime",$(".media").media("api").options.src,document.title);
	}
    }
})()