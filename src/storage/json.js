if (!Sherd) {Sherd = {};}
if (!Sherd.Storage) {Sherd.Storage = {};}
if (!Sherd.Storage.JSON) {
    Sherd.Storage.JSON = function() {
	_layers = {};
	this.annotations = {};

	this.save = function(ann,layer) {
	    var annId = (ann.id)?ann.id: 1/*TODO:RANDOM and not in this.annotations*/;
	    this.annotations[annId] = ann;
	    
	    var layer_id = layer.id();
	    //TODO:signal
	    for (a in _layers) {
		if (a != layer_id) {
		    _layers[a].update(ann.id,ann);
		}
	    }
	}
	this.load = function(ann_array,layer) {
	    for(var i=0;i<ann_array.length;i++) {
		this.save(ann_array[i],layer);
	    }
	}
	this.remove = function(ann,layer) {

	}

	this.addLayer = function(layer) {
	    var layer_id = layer.id();
	    _layers[layer_id] = layer;
	}
    }
}