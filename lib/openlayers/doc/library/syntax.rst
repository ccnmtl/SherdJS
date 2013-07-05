===============================
Understanding OpenLayers Syntax
===============================

This section is intended to get users comfortable with the syntax used when developing an application with OpenLayers.

OpenLayers "Classes"
--------------------

OpenLayers is written in a "classical" style.  This means that the library provides functions intended to be used with the ``new`` keyword that return objects.  These functions all begin with a capital letter.

.. code-block:: javascript

    var map = new OpenLayers.Map("map", options);
    
The code above creates a new ``map`` object with all the properties of the ``OpenLayers.Map`` function's prototype.  The properties that are intended to be set or accessed are documented in the `API Documentation`_

.. _`API Documentation`: http://dev.openlayers.org/apidocs

In general, all parameters to a constructor are required, except for the
options parameter. When this is not the case, the API documentation for the 
constructor will usually say so.

The ``options`` Argument
------------------------

Most OpenLayers object constructors take an ``options`` object as one of their arguments.  In general, you can set the value of any API property in a contructor's options argument.

For example, looking at the `API Docs for the Vector layer`_, you can see the ``isBaseLayer`` property.  If you specify a value for ``isBaseLayer`` in the options argument, this will be set on the layer.

.. _`API Docs for the Vector layer`: http://dev.openlayers.org/apidocs/files/OpenLayers/Layer/Vector-js.html

For example:

.. code-block:: javascript

    var layer = new OpenLayers.Layer.Vector("Layer Name", {
        isBaseLayer: true
    });
    
    layer.isBaseLayer === true;  // this is true

You can also see that the Vector layer inherits from ``OpenLayers.Layer``.  Following the link to the `Layer API documentation`_, you'll find a reference to the layer's ``projection`` property.  As with ``isBaseLayer``, if you provide a ``projection`` property in the ``options`` argument, this value will be set on the layer.

.. _`Layer API documentation`: http://dev.openlayers.org/apidocs/files/OpenLayers/Layer-js.html

.. code-block:: javascript

    var layer = new OpenLayers.Layer.Vector("Layer Name", {
        projection: new OpenLayers.Projection("EPSG:900913")
    });


