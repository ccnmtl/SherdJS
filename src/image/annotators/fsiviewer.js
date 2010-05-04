if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.Annotators) {Sherd.Image.Annotators= {};}
if (!Sherd.Image.Annotators.FSIViewer) {
    Sherd.Image.Annotators.FSIViewer = function() {
	var self = this;
	Sherd.Base.AssetView.apply(this,arguments);//inherit

	this.attachView = function(view) {
	    self.targetview = view;
	}
	this.targetstorage = [];
	this.addStorage = function(stor) {
	    this.targetstorage.push(stor);
	}

	this.getState = function(){
	    return self.targetview.getState();
	}

        this.current_state = null;
	var mode = 'create';//||'browse'
	this.setState = function(obj){
	    if (typeof obj=='object') {
                self.current_state = obj;

		///show buttons
		self.components.center.style.display = 'inline';
		self.components.redo.style.display = 'inline';
                self.components.instructions.style.display = 'none';
		mode = 'browse';
	    }
            if (obj.imageUrl) {
                var dim = {w:50,h:50};
                if (obj.wh_ratio) {
                    dim.w = dim.h * obj.wh_ratio;
                }
                var img_src = obj.imageUrl.replace('[width]',dim.w).replace('[height]',dim.h);
                self.components.image.src = img_src;
                showElement(self.components.image);
            } else {
                hideElement(self.components.image);

            }
	};

	this.initialize = function(create_obj) {
	    ///button listeners
	    connect(self.components.center,'onclick',function(evt) {
		self.targetview.setState(self.current_state);
	    });
	    connect(self.components.redo,'onclick',function(evt) {
                var current_state = self.targetview.getState();
                self.storage.update(current_state);
	    });

	}
	this.storage = {
	    'update':function(obj,just_downstream){
		if (!just_downstream) {
		    self.setState(obj);
		}
		for (var i=0;i<self.targetstorage.length;i++) {
		    self.targetstorage[i].storage.update(obj);
		}
	    }
	}
	this.microformat = {
	    'create':function(){
		var id = Sherd.Base.newID('openlayers-annotator');
		return {
		    htmlID:id,
		    text:'<div id="'+id+'" style="height:3em;margin-bottom:3em;"><img class="sherd-image-preview" src="" style="float:right;max-height:50px;max-width:50px;display:none;" /><button style="display:none;" class="sherd-image-center">View Annotation</button> <button class="sherd-image-redo">Capture View</button><p class="sherd-image-instructions">Zoom and Pan to the frame you want to save, and then click "Capture View"</p></div>'
		};
	    },
	    'components':function(html_dom,create_obj) {
		var buttons = html_dom.getElementsByTagName('button');
		return {
		    'top':html_dom,
                    'image':html_dom.getElementsByTagName('img')[0],
		    'center':buttons[0],
		    'redo':buttons[1],
                    'instructions':html_dom.getElementsByTagName('p')[0]
		}
	    }
	}
    }//END Sherd.Image.Annotators.OpenLayers
}//END if (!Sherd.Image.Annotators.OpenLayers)


