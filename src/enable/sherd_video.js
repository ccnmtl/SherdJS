/*
 TOTALLY owned by WGBH, now.  needs some work to be generic again.
 Include this javascript on your site if you want to sherd-enable the videos on your site
 This javascript will insert an 'analyze this' button adjacent to your videos, which, when clicked
 whill take the users to their analysis site

 jQuery(function(){
   suttfsadfas
 });

*/

jQuery(window).bind('load',function(){
    var LINK_TEXT = "Analyze This";
    var SHERD_SERVER_SAVE_LINK = "http://projectvietnam.ccnmtl.columbia.edu/save";
    /*DISABLING FOR ALL*/
    /*#63738: pls remove analyze this button*/
    return;

    if (document.getElementById("sherdvideobookmarkletrun"))
	return;
    var sh=document.createElement("div");
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
	if(($ && $(".media").media)/*WGBH*/
	   ||(!all.length&&h1s.length)) return h1s[0];
	while(/object/i.test(d.parentNode.tagName)){
	    d=d.parentNode;
	}
	return d.parentNode;
    };
    var x=function(emb,all,key,uri,title,more){
	var div=document.createElement("div");
	var dom = notobj(emb,all);
	dom.insertBefore(div,dom.firstChild);
	var href=SHERD_SERVER_SAVE_LINK+"?url="+escape(document.location)+"&title="+escape(title)+"&"+key+"="+escape(uri);
	if (more) {
	    for (k in more) {
		href+="&"+k+"="+escape(more[k]);
	    }
	}
	div.setAttribute("class","sherd-button");
	div.innerHTML="<a href=\""+href+"\">"+LINK_TEXT+"</a>";
	var a=div.getElementsByTagName('a')[0];
	/*TODO:this should only re-find them when emb==null*/
	a.onclick=function(){
	    findEmbeds(function(e,all,key,uri,title,more){
		    if (e!=null && key=="quicktime"){
			try{e.Stop();a.href+="#start="+Math.floor(e.GetTime()/e.GetTimeScale());}
			finally{};
		    }
		},more);
	};
	//a.setAttribute("style","padding:2px 2px 2px 20px;font-weight:bold;background-color:white;z-index:9999;position:relative;border:2px solid black;");
	//flash(a,0);
	//flash(a,500);
    };
    var opts = {};
    if($ && $(".media").media) {/*WGBH*/
	opts.poster=$(".media img").get(0).src;
    }
    function findEmbeds(x,opts) {
	var embs=document.getElementsByTagName("embed");
	for(var i=0;embs.length>i;i++){
	    var e=embs[i];
	    /*quicktime*/
	    if (/quicktime/.test(e.getAttribute("pluginspage"))){
		x(e,embs,"quicktime",e.src,document.title+i,opts);
	    }
	    /*YouTube*/
	    if (/http:\/\/www\.youtube\.com/.test(e.src)){
		x(e,embs,"youtube",e.src,document.title+i,opts);
	    }
	};
	if (!embs.length) {
	    /*WGBH*/
	    if($(".media").media) {
		x(null,embs,"quicktime",$(".media").media("api").options.src,document.title,opts);
	    }
	}
    }
    findEmbeds(x,opts);
});

