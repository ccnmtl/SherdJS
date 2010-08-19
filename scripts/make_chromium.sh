#!/bin/bash
### you can install crxmake on Ubuntu by doing the following:
### $ sudo aptitude install ruby1.8 ruby1.8-dev rubygems libopenssl-ruby 
### $ sudo gem install zipruby
### $ sudo gem install crxmake
###
### code available at: http://github.com/Constellation/crxmake
###

cp lib/jquery.min.js src/bookmarklets/browser_extensions/google_chrome/
cp src/bookmarklets/sherd.js src/bookmarklets/browser_extensions/google_chrome/

#/var/lib/gems/1.8/bin/crxmake --pack-extension=src/bookmarklets/browser_extensions/google_chrome --pack-extension-key=$1  --extension-output=src/bookmarklets/mediathread.crx  

/var/lib/gems/1.8/bin/crxmake --pack-extension=src/bookmarklets/browser_extensions/google_chrome  --extension-output=src/bookmarklets/mediathread.crx  

