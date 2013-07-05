.. _spherical-mercator:

==================
Spherical Mercator
==================

.. include:: spherical_mercator_intro.inc 

|spherical-mercator-intro| 

What is Spherical Mercator?
---------------------------
Spherical Mercator is a de facto term used inside the OpenLayers community --
and also the other existing Open Source GIS community -- to describe the
projection used by Google Maps, Microsoft Virtual Earth, Yahoo Maps, and other
commercial API providers. 

This term is used to refer to the fact that these providers use a Mercator
projection which treats the earth as a sphere, rather than a projection which
treats the earth as an ellipsoid. This affects calculations done based on 
treating the map as a flat plane, and is therefore important to be aware 
of when working with these map providers.

In order to properly overlay data on top of the maps provided by the
commerical API providers, it is neccesary to use this projection. This
applies primarily to displaying raster tiles over the commercial API layers
-- such as TMS, WMS, or other similar tiles.

In order to work well with the existing commercial APIs, many users who
create data designed for use within Google Maps will also use this
projection. One prime example is OpenStreetMap, whose raster map tiles are
all projected into the 'spherical mercator' projection. 

Projections in GIS are commonly referred to by their "EPSG" codes, identifiers
managed by the European Petroleum Survey Group. One common identifier is
"EPSG:4326", which describes maps where latitude and longitude are treated as
X/Y values. Spherical Mercator has an official designation of EPSG:3857. 
However, before this was established, a large amount of software used the 
identifier EPSG:900913. This is an unofficial code, but is still the commonly
used code in OpenLayers. Any time you see the string "EPSG:4326", you can 
assume it describes latitude/longitude coordinates. Any time you see the 
string "EPSG:900913", it will be describing coordinates in meters in x/y. 

First Map
---------

The first thing to do with the Spherical Mercator projection is to create a 
map using the projection. This map will be based on the Microsoft 
Virtual Earth API. The following HTML template will be used for the map. 

.. code-block:: html
  
  <html>
  <head>
    <title>OpenLayers Example</title>
      <script src='http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=6.1'></script>
      <script src="http://openlayers.org/api/OpenLayers.js"></script>
      </head>
      <body>
        <div style="width:100%; height:100%" id="map"></div>
        <script defer='defer' type='text/javascript'>
          // Code goes here
        </script>
      </body>
  </html>
    
**Ex. 1**: HTML Template   

The next step is to add the default Microsoft Virtual Earth layer as a 
base layer to the map.

 
.. code-block:: javascript 
  
  var map = new OpenLayers.Map('map');
  var layer = new OpenLayers.Layer.VirtualEarth("Virtual Earth",
   { 
       sphericalMercator: true,  
       maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34) 
   });
  map.addLayer(layer);
  map.zoomToMaxExtent();

This creates a map. However, once you have this map, there is something very
important to be aware of: the coordinates that you use in setCenter are not
longitude and latitude! Instead, they are in projected units -- meters, in this
case. This map will let you drag around, but without understanding a bit more
about spherical mercator, it will be difficult to do anything more with it. 

This map has a set of assumptions about the maxResolution of the map.
Specifically, most spherical mercator maps use an extent of the world from -180
to 180 longitude, and from -85.0511 to 85.0511 latitude. Because the mercator
projection stretches to infinity as you approach the poles, a cutoff in the
north-south direction is required, and this particular cutoff results in a
perfect square of projected meters. As you can see from the maxExtent
parameter sent in the constructor of the layer, the coordinates stretch from
-20037508.34 to 20037508.34 in each direction. 

The maxResolution of the map defaults to fitting this extent into 256 pixels,
resulting in a maxResolution of 156543.0339. This is handled internally by
the layer, and does not need to be set in the layer options.

If you are using a standalone WMS or TMS layer with spherical mercator, you
will need to specify the maxResolution property of the layer, in addition
to defining the maxExtent as demonstrated here. 

Working with Projected Coordinates
----------------------------------

Thankfully, OpenLayers now provides tools to help you reproject your data
on the client side. This makes it possible to transform coordinates from 
Longitude/Latitude to Spherical Mercator as part of your normal operation.
First, we will transform coordinates for use within the setCenter and
other calls. Then we will show how to use the displayProjection option on
the map to modify the display of coordinate data to take into account the
projection of the base map.

Reprojecting Points, Bounds
+++++++++++++++++++++++++++

To do this, first create a projection object for your default projection.
The standard latitude/longitude projection string is "EPSG:4326" -- 
this is latitude/longitude based on the WGS84 datum. (If your data
lines up correctly on Google Maps, this is what you have.)

You will then be creating an object to hold your coordinates, and transforming
it.

.. code-block:: javascript
   
  var proj = new OpenLayers.Projection("EPSG:4326");
  var point = new OpenLayers.LonLat(-71, 42);
  point.transform(proj, map.getProjectionObject());

The point is now projected into the spherical mercator projection,
and you can pass it to the setCenter method on the map:

.. code-block:: javascript
  
  map.setCenter(point);

This can also be done directly in the setCenter call:

.. code-block:: javascript
   
  var proj = new OpenLayers.Projection("EPSG:4326");
  var point = new OpenLayers.LonLat(-71, 42);
  map.setCenter(point.transform(proj, map.getProjectionObject()));

In this way, you can use latitude/longitude coordinates to choosing
a center for your map.

You can use the same technique for reprojecting OpenLayers.Bounds objects:
simply call the transfrom method on your Bounds object.

.. code-block:: javascript

  var bounds = new OpenLayers.Bounds(-74.047185, 40.679648, -73.907005, 40.882078)
  bounds.transform(proj, map.getProjectionObject()); 

Transformations take place on the existing object, so there is no need to 
assign a new variable. 

Reprojecting Geometries
+++++++++++++++++++++++

Geometry objects have the same transform method as LonLat and Bounds objects.
This means that any geometry object you create in your application code must
be transformed by calling the transform method on it before you add it to a 
layer, and any geometry objects that you take from a layer and wish to use
will need to be transformed before further use.

Because all transforms are in place, once you have added a geometry to a 
layer, you should not call transform on the geometry directly: instead,
you should transform a *clone* of the geometry:

.. code-block:: javascript

   var feature = vector_layer.features[0];
   var geometry = feature.geometry.clone();
   geometry.transform(layerProj, targetProj);

Reprojecting Vector Data
------------------------
When creating projected maps, it is possible to reproject vector data onto
a basemap. To do so, you must simply set the projection of your vector data
correctly, and ensure that your map projection is correct.

.. code-block:: javascript
  
  var map = new OpenLayers.Map("map", { 
    projection: new OpenLayers.Projection("EPSG:900913")
  });
  var myBaseLayer = new OpenLayers.Layer.Google("Google", 
                {'sphericalMercator': true,
                 'maxExtent': new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34) 
                });
  map.addLayer(myBaseLayer);
  var myGML = new OpenLayers.Layer.GML("GML", "mygml.gml", { 
    projection: new OpenLayers.Projection("EPSG:4326")
  });
  map.addLayer(myGML);

Note that you can also use this setup to load any format of vector data which
OpenLayers supports, including WKT, GeoJSON, KML and others. Simply specify
the format option of the GML layer.

.. code-block:: javascript
  
  var geojson = new OpenLayers.Layer.GML("GeoJSON", "geo.json", { 
    projection: new OpenLayers.Projection("EPSG:4326"),
    format: OpenLayers.Format.GeoJSON
  });
  map.addLayer(geojson);

Note that even if you set the projection object on a layer, if you are adding
features to the layer manually (via layer.addFeatures), they *must* be 
transformed before adding to the layer. OpenLayers will only transform the
projection of geometries that are created internally to the library, to
prevent duplicating projection work.

Serializing Projected Data
--------------------------
The way to serialize vector data in OpenLayers is to take a collection of data
from a vector layer and pass it to a Format class to write out data. However,
in the case of a projected map, the data that you get from this will be 
projected. To reproject the data when converting, you should pass the 
internal and external projection to the format class, then use that format
to write out your data.

.. code-block:: javascript
  
  var format = new OpenLayers.Format.GeoJSON({
    'internalProjection': new OpenLayers.Projection("EPSG:900913"),
    'externalProjection': new OpenLayers.Projection("EPSG:4326")
  });
  var jsonstring = format.write(vector_layer.features);

Display Projection on Controls
++++++++++++++++++++++++++++++

Several controls display map coordinates to the user, either directly 
or built into their links. The MousePosition and Permalink control (and its
companion control, ArgParser) both use coordinates which match the internal
projection of the map -- which in the case of Spherical Mercator layers is 
projected. To prevent user confusion, OpenLayers allows one to set a 
'display' projection. When these controls are used, transformation is made
from the map projection to the display projection. 

To use this option, when creating your map, you should specify the projection
and displayProjection options. Once this is done, the controls will 
automatically pick up this option from the map. 

.. code-block:: javascript
  
  var map = new OpenLayers.Map("map", {
    projection: new OpenLayers.Projection("EPSG:900913"),
    displayProjection: new OpenLayers.Projection("EPSG:4326")
  });
  map.addControl(new OpenLayers.Control.Permalink());
  map.addControl(new OpenLayers.Control.MousePosition());

You can then add your layer as normal. 
  
Creating Spherical Mercator Raster Images
-----------------------------------------
One of the reasons that the Spherical Mercator projection is so important is
that it is the only projection which will allow for overlaying image data on
top of commercial layers like Google Maps correctly. When using raster images,
in the browser, it is not possible to reproject the images in the same way 
it might be in a 'thick' GIS client. Instead, all images must be in the same
projection. 

How to create Spherical Mercator projected tiles depends on the software you
are using to generate your images. MapServer is covered 
in this document.

MapServer
+++++++++

MapServer uses proj.4 for its reprojection support. In order to enable 
reprojection to Spherical Mercator in MapServer, you must add the definition
for the projection to your proj.4 data directories.

On Linux systems, edit the /usr/share/proj/epsg file. At the bottom of that
file, add the line::
 
    <900913> +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs

After you do this, you must add the projection to your wms_srs metdadata in your map file::

  map 
    web 
      metadata
        wms_srs "EPSG:4326 EPSG:900913" 
      end
    end  
    # Layers go here
  end 

This will allow you to request tiles from your MapServer WMS server in the 
Spherical Mercator projection, which will align with commercial provider data
in OpenLayers.

.. code-block:: javascript

            var options = {
                projection: new OpenLayers.Projection("EPSG:900913"),
                units: "m",
                maxResolution: 156543.0339,
                maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34,
                                                 20037508.34, 20037508.34)
            };
            
            map = new OpenLayers.Map('map', options);

            // create Google Mercator layers
            var gmap = new OpenLayers.Layer.Google(
                "Google Streets",
                {'sphericalMercator': true,
                 'maxExtent': new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34) 
                }
            );
            
            // create WMS layer
            var wms = new OpenLayers.Layer.WMS(
                "World Map",
                "http://vmap0.tiles.osgeo.org/wms/vmap0",
                {'layers': 'basic', 'transparent': true}
            );
            
            map.addLayers(gmap, wms);

WMS layers automatically inherit the projection from the base layer of a map,
so there is no need to set the projection option on the layer.

GeoServer
+++++++++

Current versions of GeoServer have support for EPSG:900913 built in, so there
is no need to add additional projection data. Simply add your GeoServer layer
as a WMS and add it to the map.

Custom Tiles
++++++++++++

Another common use case for spherical mercator maps is to load custom tiles.
Many custom tile sets are created using the same projection as Google Maps,
usually with the same z/x/y scheme for accessing tiles. 


If you have tiles which are set up according to the 'Google' tile schema -- that is, based on x,y,z and starting in the upper left corner of the world -- you can load these tiles with the TMS layer with a slightly modified get_url function. (Note that in the past there was a 'LikeGoogle' layer in SVN -- this is the appropriate replacement for that code/functionality.)

First, define a getURL function that you want to use: it should accept a bounds as an argument, and will look something like this:

.. code-block:: javascript
    
    function get_my_url (bounds) {
        var res = this.map.getResolution();
        var x = Math.round ((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
        var y = Math.round ((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
        var z = this.map.getZoom();

        var path = z + "/" + x + "/" + y + "." + this.type; 
        var url = this.url;
        if (url instanceof Array) {
            url = this.selectUrl(path, url);
        }
        return url + path;
        
    }

Then, when creating your TMS layer, you pass in an option to tell the layer
what your custom tile loading function is:
 
.. code-block:: javascript
  
    new OpenLayers.Layer.TMS("Name", 
                           "http://example.com/", 
                           { 'type':'png', 'getURL':get_my_url });

This will cause the getURL function to be overridden by your function, thus requesting your inverted google-like tiles instead of standard TMS tiles.

When doing this, your map options should contain the maxExtent and 
maxResolution that are used with Google Maps:

.. code-block:: javascript
  
   new OpenLayers.Map("map", {
       maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34), 
       numZoomLevels:18, 
       maxResolution:156543.0339, 
       units:'m', 
       projection: "EPSG:900913",
       displayProjection: new OpenLayers.Projection("EPSG:4326")
   });

As describe above, when using this layer, you will interact with the map in
projected coordinates.

SphericalMercator and EPSG aliases
++++++++++++++++++++++++++++++++++

The SphericalMercator projection in OpenLayers uses code EPSG:900913. Many
other services, such as OpenStreetMap, Bing and Yahoo are now also using the
same projection, but are not necessarily supporting the use of code
EPSG:900913. Other codes, such as EPSG:3857 and EPSG:102113 were invented.
Today, there is an officially registered EPSG code 3857 whose projection is
identical to EPSG:900913.
(http://www.epsg-registry.org/export.htm?gml=urn:ogc:def:crs:EPSG::3857). So,
if you need to combine overlay layers that are using either an alias or the
official EPSG code with an OpenLayers SphericalMercator layer, you have to make
sure that OpenLayers requests EPSG:3857 or other alias in stead of EPSG:900913.
You can accomplish this by overriding the layer projection before adding the
layer to the map. For example:

.. code-block:: javascript
  
  // create sphericalmercator layers
  var googleLayer = new OpenLayers.Layer.Google("Google", {"sphericalMercator": true});
  var osmLayer = new OpenLayers.Layer.OSM("OpenStreetMap");

  // override default epsg code
  aliasproj = new OpenLayers.Projection("EPSG:3857");
  googleLayer.projection = osmLayer.projection = aliasproj;


  //add baselayers to map
  map.addLayers([googleLayer, osmLayer]);

At this point, overlays (such as WMS layers) will be requested using the
3857 code; transformations will work between 4326 and 3857 as expected.
