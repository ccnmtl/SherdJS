.. _styling:

Styling
=======

This OpenLayers Styles framework is the way to control the styling of features
attached to vector layers in OpenLayers, such as points, lines, and polygons.
It provides capabilities which correspond to the features provided by standards
like SLD, allowing the use of advanced feature styling with properties and
rules. 

Style Classes
-------------

When a feature is added to a map, its style information can come from one of
three sources:
 
* A symbolizer hash set directly on the feature. This
  is unusual, but may occur when parsing remote data which embeds
  style information at the feature level, like some KML content.
* A symbolizer hash attached to a layer as layer.style. 
* A Style or StyleMap object attached to the layer as layer.styleMap. 

A symbolizer hash is a simple JavaScript object, with key/value pairs 
describing the values to be used. :: 

  {
    'strokeWidth': 5,
    'strokeColor': '#ff0000'
  }

A StyleMap object is a more descriptive element, which allows for the use of
advanced feature-based styling. It uses the OpenLayers.Style and
OpenLayers.StyleMap objects. A style map has support for different 'render
intents': ways in which a feature should be drawn. OpenLayers uses three
different render intents internally:
 
* 'default': Used in most cases
* 'select': Used when a feature is selected
* 'temporary': Used while 'sketching' a feature.

When a feature is drawn, it is possible to pass one of these renderIntents to
the Layer's 'drawFeature' function, or to set the 'renderIntent' property of
the feature to one of these three intents.

Each renderIntent in the StyleMap has an OpenLayers Style object associated
with it. 

.. _`createSymbolizer`: http://dev.openlayers.org/docs/files/OpenLayers/Style-js.html#OpenLayers.Style.createSymbolizer

OpenLayers Style objects are descriptions of the way that features should be
rendered. When a feature is added to a layer, the layer combines the style
property with the feature to create a 'symbolizer' -- described above as a set
of style properties that will be used when rendering the layer. (Internally,
this is done via the `createSymbolizer` function.) 

Attribute Replacement Syntax
++++++++++++++++++++++++++++

The most common way of accessing attributes of the feature when creating a 
style is through the attribute replacement syntax. By using style values 
like ``${varname}`` in your style, OpenLayers can replace these strings with 
attributes of your feature. For example, if you had a GeoJSON file where each
feature had a ``thumbnail`` property describing an image to use, you might
use something like::
  
  var s = new OpenLayers.Style({ 
    'pointRadius': 10,
    'externalGraphic': '${thumbnail}'
  });

In this way, the style can contain rendering information which is dependant on
the feature.

.. _stylemap:

StyleMap
++++++++

Simple OpenLayers Style objects are instantiated by passing a symbolizer hash
to the constructor of the style. This Style can then be passed to a StyleMap constructor::

  new OpenLayers.StyleMap(s);

As a convenience, you can also create a StyleMap by passing a symbolizer hash
directly. (The StyleMap will then create the Style object for you.) ::
  
  new OpenLayers.StyleMap({'pointRadius': 10, 
                           'externalGraphic': '${thumbnail}'});

In almost all simple cases, this will be sufficient. By default, passing in a
Style object will cause all the render intents of the StyleMap to be set to the
same style. If you wish to have different Style objects for the different
render intents, instead pass a hash of Style objects or symbolizer hashes::


  var defaultStyle = new OpenLayers.Style({ 
    'pointRadius': 10,
    'externalGraphic': '${thumbnail}'
  });
  
  var selectStyle = new OpenLayers.Style({ 
    'pointRadius': 20
  });
  
  new OpenLayers.StyleMap({'default': defaultStyle, 
                           'select': selectStyle});


The "default" intent has a special role: if the extendDefault property of the
StyleMap is set to true (default), symbolizers calculated for other render
intents will extend the symbolizer calcualated for the "default" intent. So if
we want selected features just to have a different size or color, we only have
to set a single property (in this example: pointRadius).

Using Style Objects
-------------------

Once you have created a style object, it needs to be passed to a layer in order
for it to be used. The StyleMap object should be passed as the layer's 
'styleMap' option::

  
  var styleMap = new OpenLayers.StyleMap({pointRadius: 10, 
                           externalGraphic: '${thumbnail}'});
  var l = new OpenLayers.Layer.Vector("Vector Layer", 
                                      {styleMap: styleMap});

Features added to the layer will then be styled according to the StyleMap. 

Rule Based Styling 
------------------

In addition to simple attribute based styles, OpenLayers also has support for
rule-based styling -- where a property on the feature can determine the other
styles in use. For example, if you have an attribute, 'size', which is 'large'
or 'small', which determines the desired size of the icon, you can use
that property to control the pointRadius.

.. _`addUniqueValueRule`: http://dev.openlayers.org/docs/files/OpenLayers/StyleMap-js.html#OpenLayers.StyleMap.addUniqueValueRules

OpenLayers provides two different ways to do this. Many simple cases can
be solved with the `addUniqueValueRules`_ convenience function, while more
complex cases require creating your own rules.

addUniqueValueRules
+++++++++++++++++++

In order to use addUniqueValueRules, you first create a StyleMap with the 
'shared' properties of the style. As in the case above, we imagine that we
are loading features with URLs in the 'thumbnail' attribute::

  var styleMap = new OpenLayers.StyleMap({externalGraphic: '${thumbnail}'});

We then create a mapping between feature attribute value and symbolizer value,
then add rules to the default symbolizer that check for the "size" attribute
and apply the symbolizer defined in that variable::

  var lookup = {
    "small": {pointRadius: 10},
    "large": {pointRadius: 30}
  }

  styleMap.addUniqueValueRules("default", "size", lookup);

This adds rules to the Styles in the 'default' renderIntent, stating that
the Style should change the pointRadius based on the 'size' attribute of the
feature.

The symbolizers inside rules do not have to be complete symbolizers, because
they extend the default symbolizer passed with the constructor of
OpenLayers.Style or OpenLayers.StyleMap.

.. _`Unique Values example`: http://www.openlayers.org/dev/examples/styles-unique.html

The `Unique Values example`_ demonstrates the use of addUniqueValueRules.

Custom Rules
++++++++++++

OpenLayers supports many types of Rules and Filters. The addUniqueValueRules
function creats Comparison rules, with the EQUAL_TO operator. We can also
create rules that allow us to apply styles based on whether a value is greater
than or less than a value, or whether it matches a certain string, and more.

Here, we demonstrate how to create filters using the LESS_THAN and 
GREATER_THAN_OR_EQUAL_TO operators::
    
  var style = new OpenLayers.Style();
  
  var ruleLow = new OpenLayers.Rule({
    filter: new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.LESS_THAN,
        property: "amount",
        value: 20,
    }),
    symbolizer: {pointRadius: 10, fillColor: "green", 
                 fillOpacity: 0.5, strokeColor: "black"}
  });

  var ruleHigh = new OpenLayers.Rule({
    filter: new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO,
        property: "amount",
        value: 20,
    }),
    symbolizer: {pointRadius: 20, fillColor: "red", 
                 fillOpacity: 0.7, strokeColor: "black"}
  });
  
  style.addRules([ruleLow, ruleHigh]);

.. _`supported comparison filter types`: http://dev.openlayers.org/apidocs/files/OpenLayers/Filter/Comparison-js.html#OpenLayers.Filter.Comparison.type

.. _`Logical Filters`: http://dev.openlayers.org/apidocs/files/OpenLayers/Filter/Logical-js.html
.. _`Comparison Filters`: http://dev.openlayers.org/apidocs/files/OpenLayers/Filter/Comparison-js.html
.. _`FeatureId Filters`: http://dev.openlayers.org/apidocs/files/OpenLayers/Filter/FeatureId-js.html

Each of these rules uses a Comparison filter. There are several types of filters:

* `Comparison Filters`_: Comparison filters take an operator -- one of the
  `supported comparison filter types`_ -- and one or two values. It then
  evaluates whether the feature matches the comparison.

* `FeatureId Filters`_: Takes a list of Feature IDs, and evaluates to true 
  if the feature's ID is in the array.

* `Logical Filters`_: Logical filters combine other types of filters together,
  which allows building more complex rules by concatenating them using boolean
  operators (AND, OR, NOT). A Logical rule (except NOT) can have child rules. 

.. _`SLD Example`: http://openlayers.org/dev/examples/sld.html
.. _`OpenLayers.Format.SLD`: http://dev.openlayers.org/docs/files/OpenLayers/Format/SLD-js.html

Every rule can also have a minScaleDenominator and a maxScaleDenominator
property. This allows us to specify scale ranges for which the rule should
apply. We might e.g. want to show small points at small scales, but image
thumbnails at large scales. The result of such rules can be seen in the `SLD 
example`_: Zooming in one level will turn two lakes into blue. The styles and
rules from this example do not come from JavaScript-created style and rule
objects, but from a SLD document read in by `OpenLayers.Format.SLD`_.

With SLD, styles are grouped into named layers (NamedLayer), which again have a
set of named user styles (UserStyle). This is the reason why the Style object
also has layerName and name properties. For each named layer, there can be a
default style. This is marked by setting the isDefault property of the Style
object to true.

.. We could use an SLD section here, but I'm not in a mood to write it at the
   moment.

Style Properties
----------------

The properties that you can use for styling are:

* fillColor 
    Default is ``#ee9900``. This is the color used for filling in Polygons. It
    is also used in the center of marks for points: the interior color of
    circles or other shapes. It is not used if an externalGraphic is applied
    to a point.

* fillOpacity: 
    Default is ``0.4``. 
    This is the opacity used for filling in Polygons. It
    is also used in the center of marks for points: the interior color of
    circles or other shapes. It is not used if an externalGraphic is applied
    to a point.

* strokeColor
    Default is ``#ee9900``.
    This is color of the line on features. On polygons and point marks, it is
    used as an outline to the feature. On lines, this is the representation
    of the feature.

* strokeOpacity
    Default is ``1``
    This is opacity of the line on features. On polygons and point marks, it is
    used as an outline to the feature. On lines, this is the representation
    of the feature.

* strokeWidth
    Default is ``1``
    This is width of the line on features. On polygons and point marks, it is
    used as an outline to the feature. On lines, this is the representation
    of the feature.

* strokeLinecap
    Default is ``round``. Options are ``butt``, ``round``, ``square``.
    This property is similar to the `SVG stroke-linecap` property. It
    determines what the end of lines should look like. See the SVG link 
    for image examples.

.. _`SVG stroke-linecap`: http://www.w3.org/TR/SVG11/painting.html#StrokeLinecapProperty
 
* strokeDashstyle
    Default is ``solid``. Options are:
    
    * ``dot``
    * ``dash``
    * ``dashdot``
    * ``longdash``
    * ``longdashdot``
    * ``solid``
     
* pointRadius
    Default is ``6``.
    
* pointerEvents: 
    Default is ``visiblePainted``. Only used by the SVG Renderer. See `SVG pointer-events`_ definition for more.

.. _`SVG pointer-events`: http://www.w3.org/TR/SVG11/interact.html#PointerEventsProperty

* cursor
    Cursor used when mouse is over the feature. Default is an empty string,
    which inherits from parent elements.

* externalGraphic
    An external image to be used to represent a point.  

* graphicWidth, graphicHeight
    These properties define the height and width of an externalGraphic. This
    is an alternative to the pointRadius symbolizer property to be used
    when your graphic has different sizes in the X and Y direction.

* graphicOpacity
    Opacity of an external graphic.

* graphicXOffset, graphicYOffset
    Where the 'center' of an externalGraphic should be.

* rotation
    The rotation angle in degrees clockwise for a point symbolizer.

* graphicName
    Name of a type of symbol to be used for a point mark. 

* display
    Can be set to 'none' to hide features from rendering.
