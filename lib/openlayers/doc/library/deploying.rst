Deploying (Shipping OpenLayers in your Application)
===================================================

OpenLayers comes with pre-configured examples out of the box: simply download
a release of OpenLayers, and you get a full set of easy to use examples.
However, these examples are designed to be used for development. When you're
ready to deploy your application, you want a highly optimized OpenLayers
distribution, to limit bandwidth and loading time.

Single File Build
+++++++++++++++++

OpenLayers has two different types of usage: Single File, where all Javascript
code is compiled into a single file, OpenLayers.js, and the development
version, where Javascript files are all loaded at application start time.  The
single file build takes a set of OpenLayers Javascript files, orders them
according to dependancies described in the files, and compresses the resulting
file, using the jsmin compression library.

Building a single file version of the OpenLayers library changes the behavior
of the library slightly: by default, the development version of OpenLayers
expects to live in a directory called "lib", and expects that images and
CSS live in the directory above the OpenLayers.js file::

  img/pan-hand.png
  theme/default/style.css
  lib/OpenLayers.js
  lib/OpenLayers/Map.js
  ...

However, when deploying a single file build of OpenLayers, it is expected that
the library will instead be at the same level as the theme and img
directories:: 

  OpenLayers.js
  theme/default/style.css
  img/pan-hand.png
  ...

Building the Single File Build
------------------------------

The single file build tools are deployed with an OpenLayers release in the 
'build' directory. The tools require Python in order to build.

On Linux and other similar operating systems, given that OpenLayers is stored
in the 'openlayers' directory, a single file build could be created by
issuing the following commands:: 

  cd openlayers/build
  ./build.py  

This would create a file in the build directory called "OpenLayers.js", which
contains all the library code for your single file build of OpenLayers.

In Windows, from the Start Menu, select Run. Copy the path to build.py from the address bar of the Explorer Window into the text box and then add the name of the configuration file (or blank for the default):

 C:\\Downloads\\OpenLayers-2.6\\build\\build.py lite

Custom Build Profiles
+++++++++++++++++++++

In order to optimize the end-user's experience, the OpenLayers distribution
includes tools which allow you to build your own single file version of the
code. This code uses a configuration file to choose which files should be
included in the build: In this way, for production use, you can remove classes
from your OpenLayers JavaScript library file which are not used in your
application.

OpenLayers ships with two standard configurations to create a single file
version:

    full: 
        This is the full build with all files.
    lite: 
        This file includes a small subset of OpenLayers code, designed to be
        integrated into another application. It includes only the Layer types
        neccesary to create tiled or untiled WMS, and does not include any
        Controls. This is the result of what was at the time called "Webmap.js"
        at the FOSS4G 2006 Web Mapping BOF.

Profiles are simple to create. You can start by copying library.cfg or lite.cfg
to something else, e.g. myversion.cfg in the build directory.

To build a profile, you should add files needed for your application to the 
'[include]' section of the file. The files listed here should be the list of
files containing any class you use in your application. You can typically find
these classes by looking through your code for any cases where 'new
OpenLayers.ClassName()' is used.

Taking the 'lite.html' example, we see that there are two 'new' statements in
the file: one for the OpenLayers.Map class, and one for the
OpenLayers.Layer.WMS class. We then add the corresponding files to our include
section::

  [include]
  OpenLayers/Map.js
  OpenLayers/Layer/WMS.js

Once we have done that, we can build our profile by adding the profile name
to the end of our ealier build command::

  ./build.py myversion 

This will create a much smaller OpenLayers version, suitable for limited
applications.

All applications can benefit from a custom build profile. OpenLayers
supports many different layer types, but most applications will only use one
or two, and many applications do not need the full support of many of the
features in OpenLayers. In order to limit your download time and library
size, building a custom profile is highly recommended before deploying an
OpenLayers application: it can help shrink the size of your library by a 
factor of five over using the full library.

Deploying Files
+++++++++++++++

In order to deploy OpenLayers, there are several different pieces that must
be deployed.

  OpenLayers.js
    The library. This provides the JavaScript code for your application to
    use.

  theme directory
    The theme directory contains CSS and image files for newer controls,
    whose styling and positioning is controlled entirely by CSS.

  img directory
    This directory provides images to be used for some controls, like the 
    PanZoom control, which do not use CSS for styling.

As described above, when deploying these files with a single file OpenLayers
build, they should all live in the same directory: this allows OpenLayers
to properly find and include them.

Minimizing Build Size
+++++++++++++++++++++

In order to minimize the size of the files delivered to the client, there are
two important factors: minimizing the size of all downloads (via whitespace
removal, for example) and delivering compressed data to clients which
support it.

There are three types of data that OpenLayers uses, and each has a different
means of compression.

 * Control Images

   Control images are generally PNG images. These images should be compressed
   with png compression tools like pngcrush to create the minimal png images.
   The images provided with OpenLayers (both for CSS-styled and non-CSS 
   styled controls) have had this applied to them, so these images are 
   already minimized.

 * CSS

   csstidy_ is a library which removes whitespace from CSS stylesheets. 
   By using csstidy, you can reduce the size of OpenLayers stylesheets
   by approximately 30%. 

   Releases of OpenLayers beyond 2.10 include CSS tidy stylesheets in
   the theme directory with .tidy. in the name. To take advantage of 
   these stylesheets, you should create your map with a null theme,
   and include the stylesheet directly in the page.

   ::
        
        <link rel="stylesheet" href="../theme/default/style.tidy.css" type="text/css" />
        <script>
            new OpenLayers.Map("map", {
                theme: null
            });    
        </script>

 * Javascript
   
   The singlefile build tools have support for a number of tools which can
   remove whitespace from Javascript, including jsmin (from Douglas Crockford)
   and the Closure Compiler (from Google).

   When running the build tool, you can specify using the closure compiler
   by using the '-c closure' option to the build.py tool. Closure's compiler
   with the default optimizations gives approximately a 20% savings over
   jsmin's compression.

   The options available for compression are:
   
    * closure

      This requires you to have a closure-compiler.jar in your
      tools directory. You can do this by fetching the compiler
      from:
   
        http://closure-compiler.googlecode.com/files/compiler-latest.zip
   
      Then unzipping that file, and placing compiler.jar into tools
      and renaming it closure-compiler.jar.
   
    * closure_ws

      This uses the closure compiler webservice. This will only work
      for files source Javascript files which are under 1MB. (Note that
      the default OpenLayers full build is not under 1MB.)
   
    * jsmin

      jsmin is the default compiler, and uses the Python-based
      jsmin script to compress the Javascript. 
   
    * minimize

      This is a simple whitespace removing Python script, designed
      to fill in when other tools are unavailable.
   
    * none

      None will leave the Javascript uncompressed.


.. _csstidy: http://csstidy.sourceforge.net/   
