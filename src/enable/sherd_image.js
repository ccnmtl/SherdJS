/***owned by Tibetan Civilization project, at the moment
****/
jQuery(function(){
    var destination = 'http://mondrian.ccnmtl.columbia.edu/save/?';
    //so we don't have to keep them on kodos while testing
    var real_site = 'http://digitaltibet.ccnmtl.columbia.edu/';

    var img = jQuery('.node img').get(0);
    if (img) {
            var images = ImageAnnotator.images[0].imager.images; /*annotationfield*/
            var max_image = images[images.length-1];
	    var img_base = max_image.src.match(/images\/([^.]+)\./)[1];
	    var site_base = String(document.location).match(/(.*?)image/)[1];
	    var extension = max_image.src.substr(-3); /*JPG or jpg--CRAZY!!!*/
	    var sources = {
	            "title":jQuery("#node-main h2.title").get(0).innerHTML,
	            "thumb":site_base+"files/tibet/images/"+img_base+".thumbnail."+extension,
	            "xyztile":real_site+"files/tibet/images/tiles/"+img_base+"/z${z}/y${y}/x${x}.png",
	            "image":max_image.src,
	            "archive":site_base,
	            "image-metadata":"w"+max_image.width+"h"+max_image.height,
	            "xyztile-metadata":"w"+max_image.width+"h"+max_image.height
	    };

	for (a in sources) {
	    destination += ( a+'='+sources[a] +'&' );
	}

	jQuery('.byxor-control-slot div').prepend('<h2 style="display:block;float:left;margin:-2px 5px 0 5px;padding:0 5px 0 5px;background-color:white"><a href="'+destination+'" style="color:black;">Analyze This</a></h2>');
    }
});


/*
http://sky.ccnmtl.columbia.edu:8000/save/?url=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/image/main_assembly_hall_jakhyung_monastery&thumb=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.thumbnail.JPG&xyz_tile=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/tiles/14ByaKhyung%20Main%20Hall_0496/&image=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.2000x2000.JPG&

example:
http://sky.ccnmtl.columbia.edu:8000/save/?url=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/image/main_assembly_hall_jakhyung_monasterythumb=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.thumbnail.JPGxyz_tile=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/tiles/14ByaKhyung%20Main%20Hall_0496/image=http://kodos.ccnmtl.columbia.edu:5080/site/sky/tibet/files/tibet/images/14ByaKhyung%20Main%20Hall_0496.2000x2000.JPG


*/