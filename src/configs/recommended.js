//annotators

var AssetManager = new Sherd.Base.AssetManager();
var UserAnnotations = null;// = new Sherd.Storage.JSON(annotations);

/*
var CollectionView = new Sherd.AssetViews.Collection({
       'name':'user_collection1',//system set/defined
       //'colorManager':UserColor,//instance

       'target':document,//optional
       'views':[],//class AssetView with microformats

       'subviews':{ //views that can be instantiated with layers auto-created
	   'video':{
	       'views':[Sherd.AssetViews.Quicktime],//class
	       //'controller':EditFormWithAdder //instance
	       'layers':{
		   'clipstrip':{
		       'layer':ClipStrip,//class
		       'storage':UserAnnotations,//instance ;handles color? yes!
		       'options':{'editable':false,'creatable':false}
		   }
	       }
	   }
       }
    }
);
*/