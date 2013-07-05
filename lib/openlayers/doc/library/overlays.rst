.. _overlays:

Overlays
========

OpenLayers allows you to lay many different types of data on top of its various
data sources. Currently, there are two main ways of displaying vector feature
overlays in OpenLayers, each with benefits and drawbacks. This document seeks
to describe the differences, and ways in which each can be used.

Overlay Basics
--------------

There are two different types of feature rendering in OpenLayers.  One type is
the OpenLayers :ref:`vector-overlays` support, which uses vector drawing
capabilities in the browser (SVG, VML, or Canvas) to display data. The other
type is the OpenLayers :ref:`marker-overlays` support. This type of layer displays HTML
image objects inside the DOM.

In general, the Vector layer provides more capabilities, with the ability to
draw lines, polygons, and more. The Vector-based Layers are better maintained,
and are the place where most new OpenLayers development is taking place.
There is more support for various styling options, and more configurability
over layer behavior and interactions with remote servers.

However, the Markers layer is maintained for backwards compatibility, because
there are some things you can not do with vectors as they are currently
implemented, and they provide a different type of interface for event
registration. 

.. _vector-overlays:

Vector Overlays
---------------

Vector Layers form the core of Vector overlays. Vector overlays are powered
by adding sets of OpenLayers.Feature.Vectors to the map. These can be a number
of types of geometry:
 
  * Point / MultiPoint
  * Line / MultiLine
  * Polygon / MultiPolygon

They are styled using the OpenLayers.Style / OpenLayers.StyleMap properties.

.. _`StyleMap Example`: http://openlayers.org/dev/examples/stylemap.html
.. _`Context Example`: http://openlayers.org/dev/examples/styles-context.html
.. _`Rotation Example`: http://openlayers.org/dev/examples/styles-rotation.html
.. _`Unique Value Style Example`: http://openlayers.org/dev/examples/styles-unique.html

Examples: 
 
 * `StyleMap Example`_: 
     Use "Rules" to determine style attributes based on feature properties.
     This is useful for rendering based on data attributes like population. 

 * `Context Example`_: 
     Use a custom Javascript function to determine feature
     style properties. This example shows how to use which quadrant of the
     world a feature is in to determine its color. Similar rules can be
     used to do computations on a feature property to generate a style value
     (like size).

 * `Rotation Example`_: 
     Vector features support advanced styling, like feature rotation. This can
     be used, for example, to display vehicle direction, wind direction, or
     other direction-based attributes.

 * `Unique Value Style Example`_: 
     A common use case is to pick a specific style value based on a key/value
     mapping of a feature. This example demonstrates how to do that.

Interaction
###########

Vector layer interaction is achieved through the SelectFeatureControl. This control
allows selection of features, using DOM events to capture which feature is clicked
on. 

To handle feature events on a Vector Layer, you use the SelectFeature control,
in combination with an event listener registered on the layer, on the
'featureselected' event.

.. code-block:: javascript

    function selected (evt) {
        alert(evt.feature.id + " selected on " + this.name);
    }    
    var layer = new OpenLayes.Layer.Vector("VLayer");
    layer.events.register("featureselected", layer, selected);

Once you have done this, you can add a select feature control to your map:

.. code-block:: javascript

    var control = new OpenLayers.Control.SelectFeature(layer);
    map.addControl(control);
    control.activate();

The activate call will move the vector layer to the forefront of the map, so
that all events will occur on this layer.

As of OpenLayers 2.7, there is no support for selecting features from more than
a single vector layer at a time. The layer which is currently being used for
selection is the last one on which the ``.activate()`` method of the attached
select feature control was called.

Layer Types 
###########
* :ref:`layer.vector` (Base Class)
* :ref:`layer.gml` -- can load many different types of data. 
* :ref:`layer.pointtrack`
* :ref:`layer.wfs`

.. _marker-overlays:

Marker Overlays
---------------

Markers support only point geometries. They are styled only using the
OpenLayers.Icon class. They do not support lines, polygons, or other complex
features. Their interaction method differs significantly from vector layers.

In general, Markers are the 'older' way to interact with geographic data in
the browser. Most new code should, where possible, use vector layers in place
of marker layers. 

Interaction
###########

Interaction on marker layers is achieved by registering events on the
individual marker event property:

.. code-block:: javascript

    var marker = new OpenLayers.Marker(lonlat);
    marker.id = "1";
    marker.events.register("mousedown", marker, function() { 
        alert(this.id);
    });

Any number of events can be registered, and different events can be registered
for each feature.

Layer Types
###########
* :ref:`layer.markers` (Base Class)
* :ref:`layer.georss`
* :ref:`layer.text`
* :ref:`layer.boxes` (Uses Special "Box" Marker)

.. _transition-markers-to-vectors:

Transitioning from Text Layer or GeoRSS Layer to Vectors
--------------------------------------------------------

Many OpenLayers-applications make use of the :ref:`layer.text` Layer or
:ref:`layer.georss` Layer, which each parse a file (tab separated values) and
displays markers an the provided coordinates.  When clicking on one of the
markers a popup opens and displays the content of the name and description
from that location.

This behavior is relatively easy to achieve using vector layers, and doing so
allows for more configurability of the behavior when clicking on a feature.
Instead of being forced to use popups, you can instead cause the browser to
go to a new URL, or change the behavior in other ways.

Loading Data
############

To mimic the loading behavior of a :ref:`layer.text` Layer or a
:ref:`layer.georss` Layer, there are two options:

* Use a :ref:`layer.gml` Layer -- covered in this document.
* Use a :ref:`layer.vector` Layer, with a strategy and protocol.


In either case, the way for controlling the behavior of the feature selection
is the same.

Loading data with a GML Layer 
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

The :ref:`layer.gml` Layer is a simple "Load data from a URL once" data layer.
You provide it a URL, and a format to use, and it will load the data from the
URL, and parse it according to the format.

.. code-block:: javascript
  
    var layer = new OpenLayers.Layer.GML("Layer Name",
       "http://example.com/url/of/data.txt",
       { format: OpenLayers.Format.Text });
    map.addLayer(layer);
    map.zoomToMaxExtent();

This will cause your data to load, displaying your data as points on the map.


Styling Data
############

Some data formats do not include styling information, like GeoRSS. In order to
match the default OpenLayers style to the default marker in OpenLayers, you 
should create a StyleMap that matches the default OpenLayers style:

.. code-block:: javascript

   var style = new OpenLayers.Style({
       'externalGraphic': OpenLayers.Util.getImagesLocation() + "marker.png",
       'graphicHeight': 25,
       'graphicWidth': 21,
       'graphicXOffset': -10.5,
       'graphicYOffset': -12.5
   });    

   var styleMap = new OpenLayers.StyleMap({'default':style});

   var layer = new OpenLayers.Layer.GML("Layer Name",
      "http://example.com/url/of/data.txt",
      { 
        format: OpenLayers.Format.GeoRSS,
        styleMap: styleMap 
      }
   );

Using a style map like this will result in no visible difference when your 
feature is selected. To create a different style for selection -- for 
example, with a different marker color -- you could craft a second style
object, and instead create your styleMap like:  

.. code-block:: javascript    
    
    var styleMap = new OpenLayers.StyleMap({
        'default': style,
        'select': selectStyle
    });

For more information on styling your features, see the :ref:`styling` or :ref:`stylemap` documentation. 

Displaying Popups
#################

The :ref:`layer.text` Layer and the :ref:`layer.georss` Layer open popups
containing title and description text for the feature when clicked. Replicating
this behavior in your application is easy.

First, define a set of functions for managing your popup. 

.. code-block:: javascript

    function onPopupClose(evt) {
        // 'this' is the popup.
        selectControl.unselect(this.feature);
    }
    function onFeatureSelect(evt) {
        feature = evt.feature;
        popup = new OpenLayers.Popup.FramedCloud("featurePopup", 
                                 feature.geometry.getBounds().getCenterLonLat(),
                                 new OpenLayers.Size(100,100),
                                 "<h2>"+feature.attributes.title + "</h2>" + 
                                 feature.attributes.description,
                                 null, true, onPopupClose);
        feature.popup = popup;
        popup.feature = feature;
        map.addPopup(popup);
    }
    function onFeatureUnselect(evt) {
        feature = evt.feature;
        if (feature.popup) {
            popup.feature = null;
            map.removePopup(feature.popup);
            feature.popup.destroy();
            feature.popup = null;
        }
    }

Next, we define two event handlers on the layer to call these functions
appropriately. We use the layer definition from above, and assume that the
layer has been added to the map. We also add a select feature control, to
actually trigger the events:

.. code-block:: javascript

    layer.events.on({
        'featureselected': onFeatureSelect,
        'featureunselected': onFeatureUnselect
    });
    selectControl = new OpenLayers.Control.SelectFeature(layer);


Combining these two sections of code will cause the map to open a popup
any time the feature is selected, and close the popup when the feature is
unselected or the close button is pressed.

The HTML in the fourth argument to the FramedCloud constructor is based
on the type of data you are parsing. This example is based around the Text
Layer, but you can do the same with a KML layer by changing the 'title' to
'name'. The GeoRSS Layer could use the ``feature.attributes.link`` property
in addition, to create a link to the feature.

It is worth noting that this content -- passed to the FramedPopup constructor
-- is set using innerHTML, and as such, is subject to XSS attacks if the 
content in question is untrusted. If you can not trust the content in your
source files, you should employ some type of stripping to remove possibly
malicious content before setting the popup content to protect your site
from XSS attacks.

Once you've done this, you can customize the behavior of your layer to your
heart's content. Change the layout of your popup HTML, change the type of
popup, or change the click behavior to instead open a new window -- it's 
all possible, and simple, with the functionality provided by the vector
layers and SelectFeatureControl.  
