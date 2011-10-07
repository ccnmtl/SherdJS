if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.Annotators) {Sherd.Image.Annotators= {};}
if (!Sherd.Image.Annotators.FSIViewer) {
    Sherd.Image.Annotators.FSIViewer = function() {
    var self = this;
    Sherd.Base.AssetView.apply(this,arguments);//inherit

    this.attachView = function(view) {
        self.targetview = view;
    };
    this.targetstorage = [];
    this.addStorage = function(stor) {
        this.targetstorage.push(stor);
    };

    this.getState = function(){
        return self.targetview.getState();
    };

    this.current_state = null;

    // Called by asset.js
    this.setState = function(obj, options){
        if (typeof obj=='object') {
            self.current_state = obj;
                
            self.mode = null;
        
            // options.mode == null||'create'||'browse'||'edit'||'copy'
            if (!options || !options.mode || options.mode == "browse") {
                if (self.components.instructions)
                    self.components.instructions.style.display = 'none';
            }  else {
                // create, edit, copy
                if (self.components.instructions)
                    self.components.instructions.style.display = 'block';
            }
        }    
    };

    this.initialize = function(create_obj) {
        ///button listeners
        self.events.connect(self.components.center,'click',function(evt) {
            self.targetview.setState(self.current_state);
        });
        self.events.connect(self.components.redo,'click',function(evt) {
            var current_state = self.targetview.getState();
            self.storage.update(current_state);
        });

    };
    this.storage = {
        'update':function(obj,just_downstream){
            if (!just_downstream) {
                self.setState(obj);
            }
            for (var i=0;i<self.targetstorage.length;i++) {
                self.targetstorage[i].storage.update(obj);
            }
        }
    };
    this.microformat = {
        'create':function(){
            var id = Sherd.Base.newID('openlayers-annotator');
            return {
                htmlID:id,
                text:'<div id="'+id+'"><p style="display:none;" id="instructions" class="sherd-instructions">Zoom and Pan to the frame you want to save, and then click Save</p></div>'
            };
        },
        'components':function(html_dom,create_obj) {
            if (!html_dom)
                return {};
                
            var buttons = html_dom.getElementsByTagName('button');
            return {
                'top':html_dom,
                'image':html_dom.getElementsByTagName('img')[0],
                'center': document.getElementById('btnCenter'),
                'instructions': document.getElementById('instructions')
            };
        }
    };
    };//END Sherd.Image.Annotators.OpenLayers
}//END if (!Sherd.Image.Annotators.OpenLayers)


