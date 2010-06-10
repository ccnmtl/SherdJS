/***owned by Tibetan Civilization project, at the moment
****/
jQuery(function(){
    var destination = 'http://mediathread.ccnmtl.columbia.edu/save/?';
    //so we don't have to keep them on kodos while testing
    var real_site = 'http://digitaltibet.ccnmtl.columbia.edu/';

    var img = jQuery('.node img').get(0);
    if (img) {
        var images = ImageAnnotator.images[0].imager.images; /*annotationfield*/
        var max_image = images[images.length-1];
	var img_base = max_image.src.match(/images\/([^.]+)\./)[1];
	var site_base = String(document.location).match(/(.*?)image/)[1];
	var extension = max_image.src.substr(max_image.src.lastIndexOf('.'));/*.JPG or .jpg--CRAZY!!!*/
	var sources = {
	    "title":jQuery("#node-main h2.title").get(0).innerHTML,
	    "thumb":site_base+"files/tibet/images/"+img_base+".thumbnail"+extension,
	    "xyztile":real_site+"files/tibet/images/tiles/"+img_base+"/z${z}/y${y}/x${x}.png",
	    "image":max_image.src,
	    "archive":site_base,
	    "image-metadata":"w"+max_image.width+"h"+max_image.height,
	    "xyztile-metadata":"w"+max_image.width+"h"+max_image.height
	};
        
        if (!sources["url"]) sources["url"] = document.location;
	for (a in sources) {
	    destination += ( a+'='+escape(sources[a]) +'&' );
	}

	jQuery('.byxor-control-slot div').prepend('<h2 class="sherd-analyze" style="display:block;float:right;margin:-2px 0 0 0;"><a href="'+destination+'" class="sherd-analyze-link" style="display:block;color:transparent;overflow:hidden;line-height:100px;background-color:white;background-image:url(http://mediathread.ccnmtl.columbia.edu/site_media/img/analyze_button.jpg);height:26px;width:110px;overflow:hidden;">Analyze This</a></h2>');
    }
});


/*
http://sky.ccnmtl.columbia.edu:8000/save/?url=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/image/main_assembly_hall_jakhyung_monastery&thumb=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.thumbnail.JPG&xyz_tile=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/tiles/14ByaKhyung%20Main%20Hall_0496/&image=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.2000x2000.JPG&

example:
http://sky.ccnmtl.columbia.edu:8000/save/?url=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/image/main_assembly_hall_jakhyung_monasterythumb=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.thumbnail.JPGxyz_tile=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/tiles/14ByaKhyung%20Main%20Hall_0496/image=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.2000x2000.JPG


*/