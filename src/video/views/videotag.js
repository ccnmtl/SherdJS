//status: template
VideoTagMicroformat = function() {
    this.type = function() {
	return 'videotag';
    }
    this.read = function(found_obj) {
	var obj = {};
	return obj;
    }
    this.write = function(obj) {
	var html_dom;
	return html_dom;
    }
    this.find(html_dom) {
	html_dom=(html_dom)?html_dom:document;
	var found = [];
	var search_in = [
	    html_dom.getElementsByTagName('video'),
	    html_dom.getElementsByTagName('VIDEO')
	    ];
	while (var objects = search_in.shift()) {
	    for(var i=0;i<objects.length;i++) {
		found.push({'html':objects[i]});
	    }
	}
	return found;
    }
    this.update(html_dom, obj) {
	if (obj==null) {
	    //TODO:set unload,width=0,height=0
	}
	
    }

}