#!/bin/bash
cd ../lib/tiny_mce3
ant
cat > jscripts/tinymce/plugins/searchreplace/editor_plugin.js jscripts/tiny_mce/plugins/table/editor_plugin.js jscripts/tiny_mce/plugins/inlinepopups/editor_plugin.js jscripts/tiny_mce/plugins/xhtmlxtras/editor_plugin.js > ../tiny_mce3_min.js
