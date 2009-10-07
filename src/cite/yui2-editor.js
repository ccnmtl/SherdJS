/*  Sherd.Cite.YUIEditor.apply(new YAHOO.widget.SimpleEditor(HTML_ID) )
    makes it possible to add images (use images, for good IE d&d support) which reference video

 */

if (typeof Sherd=='undefined'||!Sherd) {Sherd = {};}
if (!Sherd.Cite) {Sherd.Cite = {};}
if (!Sherd.Cite.YUIEditor) {
    Sherd.Cite.YUIEditor = function(){
	var self = this;

	//OLD plan to use iframes--problematic with ffox and hover-under boxes
	//delete self.invalidHTML.iframe;
	delete self.invalidHTML.input;
	var Dom = YAHOO.util.Dom;
	var Event = YAHOO.util.Event;
	var Element = YAHOO.util.Element;

	self.on('afterNodeChange', function(evt) {
	    Event.stopEvent(evt);
	    var el = this._getSelectedElement();
	    
	    var annotation = this.microformat.read({html:el});
	    if (annotation) {
		if (window.console) {
		    window.console.log(el);
		    window.console.log(evt);
		}
		///adapted from Yahoo.Editor.js
		var win = new YAHOO.widget.EditorWindow('linkdetails', {width: '100px'});
		this.currentElement[0] = el;
		win.el = el;
		
		if (!this._windows.linkdetails) {
		    this._windows.linkdetails = {body:this._getDoc().createElement('div')}
		}
		var body = this._windows.linkdetails.body;
		//should probably be a microformat, as well!
		body.innerHTML = '<a id="sherd-yui2-editor-openvid" href="javascript:void(0)">open video</a>';
		
		//show video function
		(new Element('sherd-yui2-editor-openvid')).on('click',function() {
		    foo(el);
		});

		win.setBody(body);
		this.openWindow(win);
		//if we want to do things like not disable the toolbar,
		//we'll need to replace subclass/replace openWindow()
	    }
	}, self, /*this=self*/true);//self.on('afterNodeChange'


	if (!self.microformat) {
	    self.microformat = {
		read:function(found_obj) {
		    if (self._isElement(found_obj.html,'img')) {
			var ref = found_obj.html.getAttribute('data-reference');
			if (ref) {
			    return {id:ref};
			}
		    } 
		    return false;
		}
	    };
	}
    };//Sherd.Cite.YUIEditor
}//if (!Sherd.Cite.YUIEditor)


function foo(obj,i,drag,evt,end) {
    var str = '';
    for (a in obj) {
	str += a + ':' + obj[a] + "<br />";
    }
    if (drag) {
	//SAFARI SUX HACK!!!!!!!!!!!
	if (end) { 
	    var x = obj.src.indexOf('#');
	    obj.src = obj.src.substr(0,x);
	    //obj.src.substr(0,obj.src.indexOf('#'));
		 }
	else 
	    obj.src+="#[asdfasdfasdfasdf]";
	//evt.dataTransfer.addElement(obj);
	str = "<br />XXXXXXXXXX<br/>"+str;
	for (b in evt.dataTransfer) {
	    str = b + ':' + evt.dataTransfer[b] + "<br />" +str;
	}
	//evt.dataTransfer.dropEffect = 'copy';
	//str = evt.dataTransfer.addElement + "<br />" +str;
    }
    else {
	document.getElementById('stuff').innerHTML = str;
    }
    
}






/* Requires YUI:
  <link rel="stylesheet" type="text/css" href="../lib/yui2/assets/yui.css" >
  <link rel="stylesheet" type="text/css" href="../lib/yui2/build/menu/assets/skins/sam/menu.css" />
  <link rel="stylesheet" type="text/css" href="../lib/yui2/build/button/assets/skins/sam/button.css" />
  <link rel="stylesheet" type="text/css" href="../lib/yui2/build/container/assets/skins/sam/container.css" />
  <link rel="stylesheet" type="text/css" href="../lib/yui2/build/editor/assets/skins/sam/editor.css" />

  <script type="text/javascript" src="../lib/yui2/build/yuiloader/yuiloader-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/event/event-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/dom/dom-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/animation/animation-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/element/element-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/container/container-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/menu/menu-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/button/button-min.js"></script>
  <script type="text/javascript" src="../lib/yui2/build/editor/editor-min.js"></script>
*/

/*sample init:
var Dom = YAHOO.util.Dom;
var Event = YAHOO.util.Event;
var Element = YAHOO.util.Element;

var myConfig = {
    //defer to CSS instead
    //height: '400px'
    //,width: '350px'
    animate: true
    //,dompath: true
    ,focusAtStart: true
    ,markup:'xhmtl'
    ,ptags:true
    ,filterWord:true
};
var TEXTAREA_ID = 'project-body-field';
var myEditor;
Event.onAvailable(TEXTAREA_ID,function(evt) {
    myEditor = new YAHOO.widget.Editor(TEXTAREA_ID, myConfig);
    //CSS is all broked if this isn't true.
    (new Element(document.getElementById(TEXTAREA_ID).parentNode)).addClass('yui-skin-sam');

    moreBasicToolbar.apply(myEditor);
    //myEditor.on('toolbarLoaded', function () {myEditor.toolbar.collapse();}, myEditor, true);
    
    Sherd.Cite.YUIEditor.apply(myEditor);

    myEditor.render(); 

});//Event.onAvailable

function moreBasicToolbar() {
    this._defaultToolbar.grouplabels=false;
    this._defaultToolbar.titlebar=false;//'hello';  
    this._defaultToolbar.buttonType = 'basic';    

    var fontstyle = this._defaultToolbar.buttons[2];
    fontstyle.buttons.splice(3,3);
    var indenting = this._defaultToolbar.buttons[12];
    var linking = this._defaultToolbar.buttons[14];
    this._defaultToolbar.buttons = [fontstyle, indenting, linking];
}


*/