.. _control.snapping-detail:

OpenLayers.Control.Snapping
===========================

Provides an agent to control snapping vertices of features from one layer to nodes, vertices, and edges of features from any number of layers. The control operates as a toggle - acting as a snapping agent while active and not altering behavior of editing while not active. The control can be configured to allow node, vertex, and or edge snapping to any number of layers (given vector layers with features loaded client side). The tolerance, snapping type, and an optional filter can be configured for each target layer.

See the `Snapping API docs`_ for a complete list of configuration options.  The `Snapping example`_ demonstrates use of the control in a complete example.  While the other samples below are not complete working examples, they are intended to demonstrate different aspects of the control's behavior.

.. _`Snapping API docs`: http://dev.openlayers.org/apidocs/files/OpenLayers/Control/Snapping-js.html
.. _`Snapping example`: http://openlayers.org/dev/examples/snapping.html

Example usage:

1. Snap feature from one layer to features within the same layer using default configuration.

.. code-block:: javascript

    // Assume one vector layer named "roads".
    var snap = new OpenLayers.Control.Snapping(roads);

2. Snap features from one layer to features within the same layer using non-default configuration.

.. code-block:: javascript

    // Snap vertices to other road vertices only (not edges).
    // Use a tolerance of 30 pixels and don't engage dirt roads in snapping.
    var snap = new OpenLayers.Control.Snapping(roads, {
        targets: [{
            layer: roads,
            tolerance: 30,
            edge: false,
            filter: new OpenLayers.Filter.Comparison({
                type: OpenLayers.Filter.Comparison.NOT_EQUAL_TO,
                property: "surface",
                value: "dirt"
            })
        }]
    });

3. Snap features from one layer to features from several additional layers all using the same target layer configuration. Search all layers for the closest feature instead of snapping to the closest feature in the first layer that applies (set greedy to false).

.. code-block:: javascript

    // Assume an editable layer named "editable" and 3 target layers named "roads",
    // "parcels", and "buildings".
    var snap = new OpenLayers.Control.Snapping(editable, {
        defaults: {
            tolerance: 15,
            edge: false
        }
        targets: [roads, parcels, buildings],
        greedy: false
    });
