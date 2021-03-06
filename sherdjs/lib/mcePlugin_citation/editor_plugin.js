(function() {
    var DOM = tinymce.DOM;
    var each = tinymce.each;
    var klass='materialCitation'; //also in CSS
    var Event = tinymce.dom.Event;

    tinymce.create('tinymce.plugins.Citation', {
        getInfo : function() {
            return {
                longname : 'Citation Plugin',
                author : 'Schuyler Duveen',
                authorurl : 'http://ccnmtl.columbia.edu',
                infourl : 'http://ccnmtl.columbia.edu/mediathread',
                version : "1.1" //for tinymce 3!
            };
        },
        createCitationHTML: function(annotation) {
            var rv = ' <a href="'+annotation['annotation']+'" class="'+klass+'';
            if (annotation.type) {
                rv += ' asset-'+annotation.type;
            }
            if (annotation.range1==0) {
                rv += ' asset-whole';
            }
            rv += '">'+unescape(annotation['title'])+'</a> ';
            return rv;
            ///note that this can get changed by the url_converter.
            ///see:
            ///http://wiki.moxiecode.com/index.php/TinyMCE:Configuration/convert_urls
            ///http://wiki.moxiecode.com/index.php/TinyMCE:Configuration/urlconverter_callback
        },
        addCitation: function(evt) {
            evt = (evt) ? evt : window.event;
            var citation= evt.target||evt.srcElement;
            var annotationDict = this.decodeCitation(citation);
            if (annotationDict) {
                cite_text= this.createCitationHTML(annotationDict);
                tinyMCE.execCommand('mceInsertContent',false,cite_text);
            }
        },
        decodeCitation: function(img_elt) {
            var annotationDict = false;
            var reg = String(img_elt.src).match(/#(annotation=.+)$/);
            if (reg != null) {
                annotationDict = {};
                //stolen from Mochi
                var pairs = reg[1].replace(/\+/g, "%20").split(/\&amp\;|\&\#38\;|\&#x26;|\&/);
                each(pairs,function(p) {
                    var kv = p.split('=');
                    var key = kv.shift();
                    annotationDict[key] = kv.join('=');
                });
                //removing extraneous 0's in the timecode
                annotationDict['title']= (annotationDict['title']
                                          .replace(/([ -])0:/g,"$1")
                                          .replace(/([ -])0/g,"$1"));
            } else {
                var annotationHref=img_elt.getAttribute("name");
                var linkTitle=img_elt.getAttribute("title");
                if (linkTitle && annotationHref) {
                    annotationDict = {annotation:annotationHref, title:linkTitle};
                }
            }
            return annotationDict;
        },
        _decorateCitationAdders: function(ed, citation_plugin, dom) {
            var highlighter = null;
            each(DOM.select('img.'+klass, dom),function(citer) {
                if (citer.onclick) {
                    citer.onclick = function(evt){citation_plugin.addCitation(evt);};
                }

                ///Adds a little cursor to where it will get added.
                ///tested in Firefox, Webkit
                Event.add(citer,'mouseover',function(evt) {
                    if (highlighter == null) {
                        var active_ed = tinyMCE.activeEditor;
                        var editor_pos = DOM.getPos(active_ed.getContentAreaContainer());
                        var editor_rect = DOM.getRect(active_ed.getContentAreaContainer());
                        var cursor_pos = DOM.getPos(active_ed.selection.getNode());

                        var pos = {x:editor_pos.x + editor_rect.w, y:editor_pos.y+cursor_pos.y};
                        highlighter = DOM.create('div',{'class': 'mceContentBodyCursor', style:'top:'+pos.y+'px;left:'+pos.x+'px'},'&#171;');
                        document.body.appendChild(highlighter);
                    }
                    evt.stopPropagation();
                });
            },this);
            Event.add(document.body,'mouseover',function(evt) {
                if (highlighter != null) {
                    DOM.remove(highlighter);
                    highlighter = null;
                }
            });
        },
        init: function(ed,url) {
            //called when TinyMCE area is modified
            //but only gets triggered when focus comes to the editor.
            var self = this;
            ed.onChange.add(this._onChange, this);
            this.newStyle = false;
            this.legacy = true; //legacy support

            if (typeof tinymce.plugins.EditorWindow == 'function'
                //TODO: also test for >IE6 and other stupidness
               ) {
                this.newStyle = true;
                var css_file = url + '/skins/' + (ed.settings.citation_skin || 'minimalist') + "/citation.css";

                self._decorateCitationAdders(ed, self, document);
                self.decorateCitationAdders = function(dom) {
                    self._decorateCitationAdders(ed, self, dom);
                }
                //DOM.loadCSS(css_file);//in main--should be done at discretion of page owner
                ed.onInit.add(function(ed) {
                    ///1. add CSS to editor context
                    ed.dom.loadCSS(css_file);

                    ///2. add drop events for easy annotation dragging into the editor
                    var iframe = ed.getDoc().documentElement;
                    tinymce.dom.Event.add(iframe, 'dragover',function(evt) {
                        evt.preventDefault();
                    });
                    tinymce.dom.Event.add(iframe, 'drop',function(evt) {
                        setTimeout(function() {
                            self._onChange(ed);
                        },50);
                        evt.preventDefault();

                        if ( !/Firefox\/3/.test(navigator.userAgent)) {
                            //Firefox 3.6- seems to copy the element itself
                            // Firefox is the buggy one.
                            var droptarget = evt.target;
                            var url = String(evt.dataTransfer.getData("Text"));
                            var newimg = ed.dom.create('img',{src:url});

                            if (tinymce.isIE) {
                                //IE's target is always BODY
                                droptarget = ed.selection.getStart();
                                //still a little buggy
                                //I wish we could get better resolution
                                //of where the user is dropping the element.
                            }
                            droptarget.parentNode.insertBefore(newimg,droptarget);
                        }
                    });

                    ///3. register Citation Plugin as a special cursor window
                    ///   which can show the annotation inline, etc.
                    if (typeof ed.addCursorWindow == 'function') {
                        ed.addCursorWindow({
                            name:'citation',
                            test:function(current_elt) {
                                var par = DOM.getParent(current_elt, 'A.'+klass);
                                if (par && !par.name) return par;
                            },
                            onUnload:function( win) {
                                if (self.current_opener) {
                                    Event.remove(self.current_opener, 'click', self.opener_listener);
                                    self.asset_target = null;
                                }
                                if (self.citation && self.citation.onUnload) {
                                    self.citation.onUnload();
                                    self.citation = null;
                                }
                            },
                            content:function(a_tag) {
                                var ann_href = String(a_tag.href);
                                var dom = DOM.create('div',{},
                                                     '<a href="'+ann_href+'">View Selection</a><div class="asset-object"><div class="assetbox" style="width: 322px; display:none;"><div class="asset-display"></div><div class="clipstrip-display"></div></div></div>');
                                self.opener_listener = Event.add(dom.firstChild,'click',function(evt) {
                                    var cv = new CitationView();
                                    cv.init({
                                        autoplay:true,
                                        targets:{
                                            asset:self.asset_target
                                        }});
                                    self.citation = cv.openCitation(a_tag);
                                    evt.preventDefault();
                                });
                                self.current_opener = dom.firstChild;
                                //target should be the thing that has display:none
                                self.asset_target = dom.lastChild.firstChild;
                                return dom;
                            }
                        });
                    }
                });
                ///TODO: confirm that the right attributes are in valid_elements for the configuration (and not in invalid_elements)
            }
        },
        _onChange : function(inst, undo_level, undo_manager) {
            var dok=inst.getDoc();
            ///VITAL HACK
            if (typeof(wordCount) == 'function') {
                wordCount();//window.setTimeout(wordCount,0);
            }
            var triggerChange = false;
            each( inst.dom.select('img'), function(c) {
                var annotationDict = this.decodeCitation(c);
                if (annotationDict) {
                    //WORKAROUND: when firefox 3.5 drags a whole asset, it drags the H2
                    if (c.parentNode.parentNode.tagName.toLowerCase() == 'h2'
                        && /asset/.test(c.parentNode.parentNode.className)
                       ) {
                        c = c.parentNode.parentNode;
                    }
                    inst.dom.replace(
                        inst.dom.create('span',
                                        null,
                                        this.createCitationHTML(annotationDict)
                                       )
                        ,c//old annotation
                    );
                    triggerChange = true;
                }//if /#!annotation/.test(c.src)
            }, this);

            if (this.legacy) {
                each( inst.dom.select('input.'+klass), function(c){
                    /*This is for cleaning up, or rather, DE-cleaning up the spaces
                      around the input element which protect it from weird deletion.
                      Basically, tinyMCE cleans up spaces around the INPUT element,
                      but without a non-breaking space on each side, INPUT is subject to
                      some weird DOM deletions, or copying the value as text outside.
                    */
                    //logDebug('nextsibling',typeof(c.nextSibling));
                    if (typeof(c.nextSibling) == 'object') {
                        if (c.nextSibling == null) {
                            //logDebug('  next  null');
                        } else if (c.nextSibling.nodeType == 3) {
                            var x = c.nextSibling.textContent;
                            //logDebug('x'+c.nextSibling.data+'x',c.nextSibling.textContent.length);
                            if (x == '' || x == ' ') {
                                //logDebug('  next space');
                                c.nextSibling.nodeValue= '\xa0'; //nbsp
                            }
                        }
                    }
                    if (typeof(c.previousSibling) == 'object') {
                        if (c.previousSibling == null) {
                            //logDebug('  previous  null');
                            var p = c.parentNode;
                            p.insertBefore(dok.createTextNode('\xa0'),c);
                        } else if (c.previousSibling.nodeType == 3) {
                            var x = c.previousSibling.textContent;
                            //logDebug('x'+c.previousSibling.data+'x',c.previousSibling.textContent.length);
                            if (x == '' || x == ' ') {
                                //logDebug('  previous space');
                                c.previousSibling.nodeValue= '\xa0'; //nbsp
                            }
                        }
                    }


                },this);
            }
            if (triggerChange) {
                inst.nodeChanged();
            }
        }
    });

    // Register plugin
    tinymce.PluginManager.add("citation", tinymce.plugins.Citation);
})();
