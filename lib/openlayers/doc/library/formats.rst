=======
Formats
=======

Formats are classes that parse different sources of data into OpenLayers 
internal objects. Most (but not all) formats are centered around reading data
from an XML DOM or a string and converting them to OpenLayers.Feature.Vector
objects.

Formats are a way of transforming data from a server to objects that 
OpenLayers can interact with.


Built In Formats
++++++++++++++++

.. _format.kml:

KML
---

The KML format reads KML data and returns an array of OpenLayers.Feature.Vector
objects. 

The KML parser supports parsing local and remote styles. 

The KML parser supports fetching network links.

For fetching remoteData, the maxDepth option must be greater than 0. This
option tells the KML parser how far the traverse before giving up. 

.. #1796, #1877

*Note*: Prior to OpenLayers 2.8, the maxDepth option was broken. No setting in
the KML format would cause it to fetch network links or remote styles. 

Creating Custom Formats
+++++++++++++++++++++++

Creating custom formats, particularly for use with OpenLayers Protocols, is
relatively easy: simply create a subclass of Format that has a 'read' method
which takes in a string, and returns an array of features.

.. code-block:: javascript

  var MyFormatClass = OpenLayers.Class(OpenLayers.Format.XML, {
      read: function(data) {
          // We're going to read XML
          if(typeof data == "string") {
              data = OpenLayers.Format.XML.prototype.read.apply(this, [data]);
          }
          var elems = data.getElementByTagName("line");
          var features = [];
          var wkt = new OpenLayers.Format.WKT();
          for (var i = 0; i < elems.length; i++) {
              var node = elems[i];
              var wktString = this.concatChildValues(node);
              features.push(wkt.read(wktString));
          }
          return features;
      }
  });    

This will read an XML document that has a series of 'line' XML elements with
WKT embedded in each of them. It can be used with a "'format: MyFormatClass'
line in a Layer.GML, or a 'format: new MyFormatClass()' in Protocols which
support setting a format.
