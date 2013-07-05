.. _control.split-detail:

OpenLayers.Control.Split
========================

Provides an agent for splitting linear features on a vector layer given edits to linear features on any other vector layer or a temporary sketch layer.  The control operates in two modes.  By default, the control allows for temporary features to be drawn on a sketch layer (managed by the control) that will be used to split eligible features on the target layer.  In auto-split mode, the control listens for edits (new features or modifications to existing features) on an editable layer and splits eligible features on a target layer.

The control can be added to a map as with other controls.  It has no distinct visual representation but can be connected to a button or other tool to toggle activation with a click.  In addition, no GUI elements are provided for control configuration.  Collecting user input to configure behavior of the control is an application specific task.

See the `Split API docs`_ for a complete list of configuration options.  The `basic split feature example`_ demonstrates use of the control in a complete example, and the `snap split example`_ demonstrates the Split control in conjunction with the :ref:`Snapping <control.snapping-detail>` control.  While the other samples below are not complete working examples, they are intended to demonstrate different aspects of the control's behavior.

.. _`Split API docs`: http://dev.openlayers.org/apidocs/files/OpenLayers/Control/Split-js.html
.. _`basic split feature example`: http://openlayers.org/dev/examples/split-feature.html
.. _`snap split example`: http://openlayers.org/dev/examples/split-feature.html

Example usage:

1. Create a split control that allows temporary features to be drawn for use in splitting roads.

.. code-block:: javascript

    // Assume a vector layer named "roads".
    var split = new OpenLayers.Control.Split({layer: roads});

2. Create a control that listens for edits on the roads layer and splits existing roads with any newly created or modified roads on the same layer.

.. code-block:: javascript

    // Assume a vector layer named "roads".
    var split = new OpenLayers.Control.Split({layer: roads, source: roads});

3. Create a control that only allows roads with a dirt surface to be split.


.. code-block:: javascript

    // Assume a vector layer named "roads".
    var split = new OpenLayers.Control.Split({
        layer: roads,
        targetFilter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.EQUAL_TO,
            property: "surface",
            value: "dirt"
        })
    });

4. Do not create segments shorter than some tolerance - for intersections that occur within this distance of an existing vertex, the existing vertex will be used to split the line instead of the calculated intersection point.

.. code-block:: javascript

    // Assume a vector layer named "roads".
    var split = new OpenLayers.Control.Split({
        layer: roads, 
        source: roads,
        tolerance: 0.01 // same units as roads geometries
    });

5. Create a listener for splits that modifies feature attributes.

.. code-block:: javascript

    // Assume a vector layer named "roads".
    var split = new OpenLayers.Control.Split({
        layer: roads, 
        eventListeners: {
            "split": function(event) {
                var road;
                for(var i=0; i<event.features.length; ++i) {
                    road = event.features[i];
                    // attributes are cloned from original
                    road.attributes["length"] = road.getLength();
                }
            }
        }
    });

6. Defer deletion of split features.  Assuming a separate strategy that saves feature edits and a protocol that manages the communication, the control can be configured to set feature state instead of actually destroying split features.  Features that are split will be given the DELETE state unless they are pending INSERT (in which case they are destroyed immediately).  All new features get the INSERT state (regardless of the deferDelete value).

.. code-block:: javascript

    // Assume a vector layer named "roads".
    var split = new OpenLayers.Control.Split({
        layer: roads,
        deferDelete: true,
        tolerance: 0.001
    });
