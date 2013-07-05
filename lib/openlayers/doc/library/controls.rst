========
Controls
========

Controls are OpenLayers classes which affect the state of the map, or display
additional information to the user. Controls are the primary interface for
map interactions.

Default Controls
----------------

The following controls are default controls on the map:
 
* :ref:`control.argparser`
* Attribution
* Navigation
* PanZoom

Panels
------

Control panels allow collections of multiple controls together, as is common
in many applications. 

.. _styling_panels:

Styling Panels
++++++++++++++

Panels are styled by CSS. The "ItemActive" and "ItemInactive" are added to the 
control's displayClass.

All controls have an overridable 'displayClass' property which maps to
their base CSS class name. This name is calculated by changing the 
class name by removing all '.' characters, and changing "OpenLayers" to 
"ol". So, OpenLayers.Control.ZoomBox changes to olControlZoomBox. 

Panel items are styled by combining the style of the Panel with the style
of a control inside of it. Using the NavToolbar Panel as an example:

.. code-block:: css
    
    .olControlNavToolbar div {
      display:block;
      width:  28px;
      height: 28px;
      top: 300px;
      left: 6px;
      position: relative;
    }
    .olControlNavToolbar .olControlNavigationItemActive {
      background-image: url("img/panning-hand-on.png");
      background-repeat: no-repeat;
    }
    .olControlNavToolbar .olControlNavigationItemInactive {
      background-image: url("img/panning-hand-off.png");
      background-repeat: no-repeat;
    }

Here, we say:

* Div elements displayed inside the toolbar are 28px wide and 28px high. 
  The top of the div should be at 300px, the left side should be at 6px.
* Then, for the control, we provide two background images: one for active
  and one for inactive. 

For toolbars to go left to right, you can also control them with CSS:

.. code-block:: css
    
    .olControlEditingToolbar div {
        float:right;
        right: 0px;
        height: 30px;
        width: 200px;
    }

Simply set the 'float: right' parameter, and give the parent element some 

In order to improve the user experience, existing panels like the
:ref:`control.editingtoolbar` use a single background image, and control the 
icon to display via 'top' and 'left' parameters, offsetting and clipping 
the background image. This is not required, but doing this makes it so that
when you select a tool, you don't have to wait for the 'inactive' image
to display before continuing.

Controls to be used with Panels
+++++++++++++++++++++++++++++++

Panels can have controls of many 'types' inside of them. Each tool in a panel
should have a 'type' attribute which is one of:
    
* OpenLayers.Control.TYPE_TOOL (the default)
* OpenLayers.Control.TYPE_BUTTON
* OpenLayers.Control.TYPE_TOGGLE

.. _customizing_panels:

Customizing an Existing Panel
+++++++++++++++++++++++++++++

Several existing panels -- like the :ref:`control.editingtoolbar` or
:ref:`control.panpanel` -- have multiple controls combined, but it is not
always desirable to use all those controls. However, it is relatively simple to
createa control which mimics the behavior of these controls. For example, if
you wish to create an editing toolbar control that only has the ability to draw
lines, you could do so with the following code:

.. code-block:: javascript
   
   var layer = new OpenLayers.Layer.Vector();
   var panelControls = [
    new OpenLayers.Control.Navigation(),
    new OpenLayers.Control.DrawFeature(layer, 
        OpenLayers.Handler.Path, 
        {'displayClass': 'olControlDrawFeaturePath'})
   ];     
   var toolbar = new OpenLayers.Control.Panel({
      displayClass: 'olControlEditingToolbar',
      defaultControl: panelControls[0]
   });
   toolbar.addControls(panelControls);
   map.addControl(toolbar);

There are two things to note here:

* We are reusing the style of the EditingToolbar by taking its 'displayClass'
  property. This means we will pick up the default icons and so on of the
  CSS for that toolbar. (For more details, see :ref:`styling_panels`.)
* We set the default control to be the Navigation control, but we could just
  as easily change that.

In this way, you can use any control which works in a panel -- including,
for example, the SelectFeature control, the ZoomToMaxExtent control, and 
more, simply by changing the controls which are in the list.

Map Controls
------------

.. _control.argparser:

ArgParser
+++++++++

Takes URL arguments, and updates the map.

In order for the ArgParser control to work, you must check that 'getCenter()'
returns null before centering your map for the first time. Most applications
use a setCenter or zoomToMaxExtent call: this call should be avoided if the
center is already set.

.. code-block:: javascript

    var map = new OpenLayers.Map('map');
    var layer = new OpenLayers.Layer();
    map.addLayer(layer);

    // Ensure that center is not set
    if (!map.getCenter()) {
        map.setCenter(new OpenLayers.LonLat(-71, 42), 4);
    }    

The ArgParser control is enabled by default.

.. _control.attribution:

Attribution
+++++++++++

The attribution control will display attribution properties set on any layers
in the map in the lower right corner of the map, by default. The style and
location of this control can be overridden by overriding the
'olControlAttribution' CSS class. 

Use of the attribution control is demonstrated in the `Attribution example`_.
For API information, see the `Attribution API Docs`_.

.. _`Attribution Example`: http://openlayers.org/dev/examples/attribution.html

.. _`Attribution API Docs`: http://dev.openlayers.org/apidocs/files/OpenLayers/Control/Attribution-js.html

.. _control.dragfeature:

DragFeature
+++++++++++

.. _control.dragpan:

DragPan
+++++++

The DragPan control implements map dragging interactions. 

.. _control.drawfeature:

DrawFeature
+++++++++++

.. _control.editingtoolbar:

EditingToolbar
++++++++++++++

Display a :ref:`control.navigation` control, along with three editing tools:
Point, Path, and Polygon. If this does not fit your needs, see
:ref:`customizing_panels` above.

.. _control.keyboarddefaults:

KeyboardDefaults
++++++++++++++++

.. _control.layerswitcher:

LayerSwitcher
+++++++++++++

.. _control.measure:

Measure
+++++++

A planar distance measuring tool.

.. _control.modifyfeature:

ModifyFeature
+++++++++++++

The ModifyFeature control can be used to edit an existing vector object.

This control causes three different types of events to fire on the layer:
* beforefeaturemodified - triggered when a user selects the feature to begin editing. 
* featuremodified - triggered when a user changes something about the feature.
* afterfeaturemodified - triggered after the user unselects the feature.

To register for one of these events, register on the layer:

.. code-block:: javascript

  var layer = new OpenLayers.Layer.Vector("");
  layer.events.on({
    'beforefeaturemodified': function(evt) {
        console.log("Selected " + evt.feature.id  + " for modification");
    },    
    'afterfeaturemodified': function(evt) {
        console.log("Finished with " + evt.feature.id);
    }
  });  

There are several different modes that the ModifyFeature control can work in.
These can be combined to work together.

* RESHAPE -- The default. Allos changing the vertices of a feature by dragging existing vertices, creating new vertices by dragging 'virtual vertices', or deleting vertices by hovering over a vertice and pressing the delete key.
* RESIZE -- Allows changing the size of a geometry.
* ROTATE -- change the orientation of the geometry
* DRAG -- change the position of the geometry.

When creating the control, you can use a bitwise OR to combine these:

.. code-block:: javascript

  var modifyFeature = new OpenLayers.Control.ModifyFeature(layer, {
    mode: OpenLayers.Control.ModifyFeature.RESIZE | OpenLayers.Control.ModifyFeature.DRAG
  });  

For an example of using the ModifyFeature control, see the `ModifyFeature
example`_. For API information, see the `ModifyFeature API Documentation`_.

The ModifyFeature control can only be used with a single layer at any given
time. To modify multiple layers, use multiple ModifyFeature controls. 

Deprecation Warning
@@@@@@@@@@@@@@@@@@@

As of OpenLayers 2.6, the onModificationStart, onModification and
onModificationEnd functions on this control are no longer the recommended way
to receive modification events. Instead, use the beforefeaturemodified,
featuremodified, and afterfeaturemodified events to handle these cases.

.. _`ModifyFeature API Documentation`: http://dev.openlayers.org/apidocs/files/OpenLayers/Control/ModifyFeature-js.html 
.. _`ModifyFeature example`: http://openlayers.org/dev/examples/modify-feature.html

.. _control.mouseposition:

MousePosition
+++++++++++++

.. _control.navtoolbar:

NavToolbar
++++++++++

.. _control.navigation:

Navigation
++++++++++

The replacement control for the former :ref:`control.mousedefaults` control. 
This control is a combination of:

* :ref:`control.dragpan`
* :ref:`control.zoombox`
* Handler.Click, for double click zooming
* Handler.Wheel, for wheel zooming

The most common request for the Navigation control is to disable wheel 
zooming when using the control. To do this, ensure that no other navigation
controls are added to your map -- for example, by an
:ref:`control.editingtoolbar` -- and call disableWheelNavigation on the 
Navigation control.


NavigationHistory
+++++++++++++++++

OverviewMap
+++++++++++

.. _control.panpanel:

PanPanel
++++++++
A set of visual buttons for controlling the location of the map. A subclass
of Control.Panel, this is easily controlled by styling via CSS. The
``.olControlPanPanel`` class, and its internal divs, control the styling of  
the PanPanel. If you wish to customize the look and feel of the controls
in the upper left corner of the map, this control is the one for you.

This control is designed to work with the :ref:`control.zoompanel` control
to replicate the functionality of the :ref:`control.panzoom` control.

.. _control.panzoom:

PanZoom
+++++++

PanZoomBar
++++++++++

Permalink
+++++++++

The Permalink control, together with the ArgParser control, are designed to 
make it easy to link to an existing map view. By adding the permalink control 
to your map, you will make available a piece of text in the map that acts as
a link for your users.

In order for the permalink to work, you must ensure that you check whether the
center has already been set by the ArgParser control before you set the center
of your map. To do this, simply check map.getCenter() first:

.. code-block:: javascript

  if (!map.getCenter()) {
    map.setCenter(new OpenLayers.LonLat(0,0),0);
  }
  

Scale
+++++

ScaleLine
+++++++++

SelectFeature
+++++++++++++

.. _control.snapping:

Snapping
++++++++

Provides an agent to control snapping vertices of features from one layer to nodes, vertices, and edges of features from any number of layers. The control operates as a toggle - acting as a snapping agent while active and not altering behavior of editing while not active. The control can be configured to allow node, vertex, and or edge snapping to any number of layers (given vector layers with features loaded client side). The tolerance, snapping type, and an optional filter can be configured for each target layer.

Find more detail on the :ref:`control.snapping-detail` page.

.. _control.split:

Split
+++++

Provides an agent for splitting linear features on a vector layer given edits to linear features on any other vector layer or a temporary sketch layer.  The control operates in two modes.  By default, the control allows for temporary features to be drawn on a sketch layer (managed by the control) that will be used to split eligible features on the target layer.  In auto-split mode, the control listens for edits (new features or modifications to existing features) on an editable layer and splits eligible features on a target layer.

The control can be added to a map as with other controls.  It has no distinct visual representation but can be connected to a button or other tool to toggle activation with a click.  In addition, no GUI elements are provided for control configuration.  Collecting user input to configure behavior of the control is an application specific task.

Find more detail on the :ref:`control.split-detail` page.

.. _control.zoombox:

ZoomBox
+++++++

.. _control.zoompanel:

ZoomPanel
+++++++++

A set of visual buttons for controlling the zoom of the map. A subclass
of Control.Panel, this is easily controlled by styling via CSS. The
``.olControlZoomPanel`` class, and its internal divs, control the styling of  
the PanPanel. If you wish to customize the look and feel of the controls
in the upper left corner of the map, this control is the one for you.

This control is designed to work with the :ref:`control.panpanel` control
to replicate the functionality of the :ref:`control.panzoom` control.

Button Classes
--------------

These classes have no UI on their own, and are primarily designed to be used
inside of a control panel.

Pan
+++

Used inside the PanPanel; when triggered, causes the map to pan in a 
specific direction.

ZoomIn
++++++

Used inside the PanPanel; when triggered, causes the map to zoom in. 

ZoomOut
+++++++

Used inside the PanPanel; when triggered, causes the map to zoom out. 

ZoomToMaxExtent
+++++++++++++++

Used inside the PanPanel; when triggered, causes the map to zoomToMaxExtent. 


Generic Base Classes
--------------------

The following classes are used primarily for subclassing, and are not meant
to be used directly.

Button
++++++

Used inside of Panel controls.

Panel
+++++

Used as a base for NavToolbar and EditingToolbar controls, as well as others.
Gathers up buttons/tools to be used together.

Deprecated Controls
------------------- 

.. _control.mousedefaults:

MouseDefaults
+++++++++++++

Replaced by the :ref:`control.navigation` control.

MouseToolbar
++++++++++++

Replaced by the :ref:`control.navtoolbar` control.
   
More documentation 
------------------

.. toctree::

   controls/snapping
   controls/split
