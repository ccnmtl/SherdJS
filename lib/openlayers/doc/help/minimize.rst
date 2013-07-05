Minimizing your code
++++++++++++++++++++

Minimizing Test Cases
---------------------

In order for developers to help fix a problem, they first have to
understand it. In order to do that, they need to understand everything
thati s going on in a situation where the problem is reproducible.
Oftentimes, the particular behavior is only existing in a certain type
of situation, or in a limited case that is not exploited by the commonly
used code. (In addition, some problems are the result of user error in
some way.) 

In order to help developers help you, the best thing to do is to
minimize the error to the *smallest amount of code that can cause it to
happen*. Additionally, when attempting to reproduce, any developer will
need to set up the code so that it is possible to run in the developer's
test environment. This means that it is ideal to remove external
references to other Javascript files, and external files at all, where
possible. (Clearly, this is not always possible: WFS server bugs can't
typically be demonstrated inside of a single page, for example -- but
you should minimize external dependancies as much as possible.)

Once you've done this, you should remove *all non-neccesary lines of
code* from your example. Does the problem require the ScaleBar control
in order to manifest itself? If not, toss it. Does it need multiple
layers? If not, toss them. In short, any line of code that is not
directly related to reproducing the problem should be removed, as each
line will need to be read by the developer -- and in the case of
multiple developers working on a problem, read by *each* developer -- in
order to determine whether the problem is related to that.

This minimization step should include removing any unneccesary
Javascript, unneccesary CSS files, unneccesary HTML, etc. until the
resulting code is as small as possible.

Many times, in doing this, you will come across a particular
minimization step that causes the problem to go away. This is a good
sign, because it means you have narrowed the problem down to that
particular aspect of code. Put it back, and keep minimizing.

Additionally, many times in doing this, you find a particular construct
in your code that can help you understand how to work around the
problem. 

If not, then continue onto the next section.

OpenLayers Library References
=============================

There are multiple hosted versions of the OpenLayers library. 

  http://openlayers.org/api/OpenLayers.js

This will always represent the most recent released 'stable' version of
the OpenLayers API.

 http://openlayers.org/dev/OpenLayers.js

This is always a 10-minute delayed build of OpenLayers trunk.

To simplify allowing developers to set up the code on their own testing
environments, it is often beneficial to point directly to one of these
library URLs. In addition, this also ensures that the problem is not
something specific to your build of OpenLayers. 

Publishing your Problem
-----------------------

Once you have minimized your test case, you need to publish it. In
general, it is easiest if you publish an HTML page on a web accessible
URL. Even if your project is not yet public, you can likely put a page
up on another server which demonstrates the problem. Doing this is much
more likely to have a developer actually follow the link and explore
your problem. This is *especially* true for things like WFS which
require a proxy to work correctly:  Downloading the page, setting up a
proxy, and testing locally is a lot of work for a developer simply to
confirm that a problem exists.

If you do not have *any* place to publish webpages, you can attempt to
paste your code to a public site like 'nopaste.com'. However, be aware
that doing so means that a developer has to perform more steps to
reproduce your problem -- and every step is one that makes the problem
less likely to be solved quickly and easily.

Communicating about your Problem
--------------------------------

The best way to communicate your problem is to send an email to the
users list demonstrating the problem. Oftentimes other users will be
able to point out a particular flaw in your code that is causing the
error, or explain that the behavior is a known lack of functionality in
OpenLayers.

*Be clear on steps for reproduction*. Users who don't know what they're
supposed to do to cause the bug will not be able to see it, and if they
can't see it, they can't help you.

*Be clear on expected behavior*. Oftentimes, it is unclear why you think
something is not working, because the behavior you're seeing is expected or
the problem is otherwise not obvious. Explain what you expect to see.

If you have determined the particular change in the OpenLayers source
code which is required to change the behavior, then it is more likely
that the Developers list is the best place to go. Any discussion which
involves code from OpenLayers itself is probably better suited for the
dev list. 

Finally,
--------

By following the steps: 
 * Simplify/Minimize
 * Publish
 * Communicate

(If you'd like, you can toss a "???, Profit!" at the end of this.)

You can ensure that it is as easy as possible for a developer to
determine whether the problem you're having is with the library. You
also make it easier for develpoers and users to find potential problems
in your usage of the library and suggest solutions. Finally, you may
find in the process that you find the bug yourself, thus saving yourself
and everyone else time in trying to debug.

The end result is a more workable system for everyone. The easier it is
to understand the problem you're having, the faster, and more easily,
you will be able to get help.

