Mobile Browsing
+++++++++++++++

Mobile browsing generally demands a different method of map navigation. 
OpenLayers built in Navigation and TouchNavigation controls attempt to 
handle this appropriately by default, using whatever events are available
in the browser in use.

These controls were added after OpenLayers 2.10.

Map Dragging
------------

Browsers which support touch events (touchstart/touchmove/touchend) will
support dragging the map by touch, in the same way that you can generally
navigate other map applications on these platforms.

Both the Navigation Control and the TouchNavigation Control support 
this method of moving.

Pinch Zoom
----------

On devices which support multiple touch events, it is possible to zoom
the map by pinching in or out. This is provided by Control.PinchZoom,
which uses Handler.PinchZoom internally.

Both the Navigation Control and the TouchNavigation Control include
this method of zooming by default.

Pinch zooming only works if your device delivers information about multiple
touch events to the browser. This support exists in iOS 2.0+, and was 
added around the time of Android 2.2, but not all Android devices deliver
this information to the browser. To test whether your Android device
delivers this information, you can visit the `Multitouch Test Page`_; 
if your browser supports multiple touch events, you should see the number
go to 2 when placing multiple fingers on the screen in that example.

.. _`Multitouch Test Page`: http://bit.ly/eDZrIw

Tap Panning
-----------

In order to support touch browsers which do not support touch events, 
OpenLayers attempts to support 'tap panning', or panning to the center of
a tap on the map. Combined with a set of zoom controls, this makes it
possible for these types of browser to navigate the map.

This functionality is enabled by default. To disable it explicitly (if you
find it is enabled in cases you would not otherwise expect it to be),
you can set {'clickOptions': {'tap': false}} in the Navigation control
options.

There are some mobile devices which behave very similar to browsers with
regard to taps; if you have a more advanced detection mechanism for
finding these browsers and wish to enable tap-pan navigation explicitly,
you can do so by passing true as the tap click option.

In general, devices which support tap but not touch will zoom on a double
click. There is not generally any way to prevent this behavior.

Mobile Browser Support
----------------------

+----------------+--------------+------------------+---------------+-------------+
| Browser        | Touch events | Multiple touches | Accelerometer | geolocation |
+================+==============+==================+===============+=============+
| iOS (4.x)      | yes          | yes              | yes           | yes         |
+----------------+--------------+------------------+---------------+-------------+
| iOS (3.x)      | yes          | yes              | no            | yes         |
+----------------+--------------+------------------+---------------+-------------+
| iOS (2.x)      | yes          | yes              | no            | ?           |
+----------------+--------------+------------------+---------------+-------------+
| iOS (1.x)      | yes          | no               | no            | ?           |
+----------------+--------------+------------------+---------------+-------------+
| Android        | yes          | no(2)            | no            | yes         |
+----------------+--------------+------------------+---------------+-------------+
| Opera Mobile   | no           | no               | no            | yes         |
+----------------+--------------+------------------+---------------+-------------+
| Symbian        | no           | no               | no            | no          |
+----------------+--------------+------------------+---------------+-------------+
| IE7 (WP7)      | no           | no               | no            | no          |
+----------------+--------------+------------------+---------------+-------------+
| Firefox 4(1)   | no           | no               | no            | yes         |
+----------------+--------------+------------------+---------------+-------------+

1. Firefox 4 beta supports touch events on Windows 7 via the
   MozTouchDown/MozTouchMove events. Due to lack of available testing
   platforms, the OpenLayers code does not currently support this type of
   touch events.
2. The stock android browser does not have any support for multiple touch events.
   Some users on specific Samsung models reported success with using pinch-zoom
   in OpenLayers and maps.google.com with 2.1, but lost that functionality after
   an upgrade to 2.2. There is an `open bug ticket`_ in Android about supporting
   multiple touch events in the DOM, but no obvious plan for when such a thing
   might exist.

.. _`open bug ticket`: http://code.google.com/p/android/issues/detail?id=11909   
