.. _request:

Requesting Remote Data
======================

There are a number of ways to get data from the server to the client.  Setting image, script, and stylesheet sources can be done at any time to request new data without refreshing an entire document.  These types of requests can be made to any origin.  Another way to retrieve data from a server is to update the location of a document in a frame (iframe or otherwise).  These types of requests can also be made to any origin.  However, the code running in the original document is restricted to reading data in documents that come from the same origin.  This means if your application is served from http://example.com, your code may load a document in a frame from any other origin (say http://example.net), but your code can only access data in that document if it was served via the same protocol (http), from the same domain (example.com), and on the same port (likely 80 in this case).

The above types of request are useful because they are asynchonous.  That is, the user can continue to view and interact with the original page while additional data is being requested.  A more common way to request data asynchronously is to use the `XMLHttpRequst <http://www.w3.org/TR/XMLHttpRequest/>`_ object.  With an XMLHttpRequest object, you can open a conection to a server and send or receive data via HTTP (or HTTPS).  XMLHttpRequest objects are a bit awkward to use and are unfortunately not supported in all browsers.  OpenLayers provides a cross-browser `XMLHttpRequest <http://code.google.com/p/xmlhttprequest/>`_ function and wraps it in some convenient ``OpenLayers.Request`` methods.

In general, all communication initiated by ``OpenLayers.Request`` methods is restricted to the same origin policy: requests may only be issued with the same protocol, to the same domain, and through the same port as the document the code is running from.  The ``OpenLayers.Request`` methods allow you to access data asynchronously or synchronously (synchronous requests will lock the UI while the request is pending).

.. note::
    Though you may read about cross-domain Ajax, unless a user has specifically configured their browser's security settings, the same origin policy will apply to requests with XMLHttpRequest.  The "cross-domain" functionality is typically achieved by either setting up a proxy (on the same origin) that passes on all communication to a remote server or by requesting data without the XMLHttpRequest object (in a script tag for example).  One nuance of the same origin policy is that code running on a page from one domain may set the ``document.domain`` property to a suffix of the original domain.  This means that code running on a document from sub.example.com may request data from example.com by setting ``document.domain`` to example.com.  A document from example.com, however, cannot prefix the domain property to request data from a sub domain.

The ``OpenLayers.Request`` methods correspond to the common HTTP verbs: GET, POST, PUT, DELETE, HEAD, and OPTIONS.  See the `Request API documentation`_ for a description of each of these methods.  The short examples below demonstrate the use of these methods under a variety of conditions.

.. _`Request API documentation`: http://dev.openlayers.org/apidocs/files/OpenLayers/Request-js.html

Example usage
-------------

1. Issue a GET request and deal with the response. 

.. code-block:: javascript

    function handler(request) {
        // if the response was XML, try the parsed doc
        alert(request.responseXML);
        // otherwise, you've got the response text
        alert(request.responseText);
        // and don't forget you've got status codes
        alert(request.status);
        // and of course you can get headers
        alert(request.getAllResponseHeaders());
        // etc.
    }

    var request = OpenLayers.Request.GET({
        url: "http://host/path",
        callback: handler
    });

2. Issue a GET request with a query string based on key:value pairs. 

.. code-block:: javascript

    function handler(request) {
        // do something with the response
        alert(request.responseXML);
    }

    var request = OpenLayers.Request.GET({
        url: "http://host/path",
        params: {somekey: "some value & this will be encoded properly"},
        callback: handler
    });

3. Issue a GET request where the handler is a public method on some object. 

.. code-block:: javascript

    // assuming obj was constructed earlier
    obj.handler = function(request) {
        this.doSomething(request);
    }
    
    var request = OpenLayers.Request.GET({
        url: "http://host/path",
        callback: obj.handler,
        scope: obj
    });

4. Issue a synchronous GET request. 

.. code-block:: javascript

    var request = OpenLayers.Request.GET({
        url: "http://host/path",
        async: false
    });
    // do something with the response
    alert(request.responseXML);

5. Issue a POST request with some data. 

.. code-block:: javascript

    // assuming you already know how to create your handler
    var request = OpenLayers.Request.POST({
        url: "http://host/path",
        data: "my data to post",
        callback: handler
    });

6. Issue a POST request with a custom content type (application/xml is default). 

.. code-block:: javascript

    // again assuming you have a handler
    var request = OpenLayers.Request.POST({
        url: "http://host/path",
        data: "this is text not xml!",
        headers: {
            "Content-Type": "text/plain"
        },
        callback: handler
    });

7. Issue a POST request with form-encoded data. 

.. code-block:: javascript

    var request = OpenLayers.Request.POST({
        url: "http://host/path",
        data: OpenLayers.Util.getParameterString({foo: "bar"}),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        callback: handler
    })

8. Issue a GET request and then abort it. 

.. code-block:: javascript

    var request = OpenLayers.Request.GET(); // dumb, but possible
    request.abort();

9. Deal with the many ways that a request can "fail." 

.. code-block:: javascript

    function handler(request) {
        // the server could report an error
        if(request.status == 500) {
            // do something to calm the user
        }
        // the server could say you sent too much stuff
        if(request.status == 413) {
            // tell the user to trim their request a bit
        }
        // the browser's parser may have failed
        if(!request.responseXML) {
            // get ready for parsing by hand
        }
        // etc.
    }
    // issue a request as above

10. Issue DELETE, PUT, HEAD, and OPTIONS requests. 

.. code-block:: javascript

    // handlers defined elsewhere
    
    var deleteRequest = OpenLayers.Request.DELETE({
        url: "http://host/path",
        callback: deleteHandler
    });
    
    var putRequest = OpenLayers.Request.PUT({
        url: "http://host/path",
        callback: putHandler
    });
    
    var headRequest = OpenLayers.Request.HEAD({
        url: "http://host/path",
        callback: headHandler
    });
    
    var optionsRequest = OpenLayers.Request.OPTIONS({
        url: "http://host/path",
        callback: optionsHandler
    });

11. (Rare) Issue a GET request using a proxy other than the one specified in OpenLayers.ProxyHost (same origin policy applies). 

.. code-block:: javascript

    // handler defined elsewhere
    var request == OpenLayers.Request.GET({
        url: "http://host/path",
        params: {somekey: "some value"},
        proxy: "http://sameorigin/proxy?url=" // defaults to OpenLayers.ProxyHost
    });
