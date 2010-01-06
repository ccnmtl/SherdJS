/*
  support for the YouTube js-enabled player.  documentation at:
  http://code.google.com/apis/youtube/js_api_reference.html
  http://code.google.com/apis/youtube/chromeless_example_1.html

  TODO: UNREQUIRE  dependency: Clipper() WaitUntil()
  TODO: implement AssetView

  http://localhost:8000/save/?url=http%3A//www.youtube.com/v/OdBNxqJ-_60&title=Night%20Parkour&youtube=http%3A//www.youtube.com/v/OdBNxqJ-_60&poster=http%3A//www.youtube.com/v/OdBNxqJ-_60
 */

// global function required to catch YouTube player ready event
// also, the place to register for events and state changes.
// Currently, not utilizing either approach, opting for a timer instead.
function onYouTubePlayerReady(playerId) {
}

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.YouTube && Sherd.Video.Base) {
    Sherd.Video.YouTube = function() {
        var self = this;
        var _playerId;
        var _autoplay = 0;
        
        Sherd.Base.AssetView.apply(this,arguments); //inherit -- base.js
        Sherd.Video.Base.apply(this,arguments); //inherit -- video.js
        
        this.microformat.type = function() { return 'youtube'; };
        
        // create == asset->{html+information to make it}
        this.microformat.create = function(obj,doc) {
            log('create');
            var wrapperId = Sherd.Base.newID('youtube-wrapper');
            _playerId = Sherd.Base.newID('youtube-player-');
            _autoplay = obj.autoplay ? 1 : 0;
            
            if (!obj.options) 
            {
                obj.options = {
                    width: obj.presentation == 'small' ? 310 : 620, // youtube default
                    height: obj.presentation == 'small' ? 220 : 440, // youtube default
                    playerId: _playerId,
                    wrapperId: wrapperId,
                    autoplay: _autoplay
                };
            }

            return {
                object: obj,
                htmlID: wrapperId,
                text: '<div id="' + wrapperId + '" class="sherd-youtube-wrapper">' + 
                      '  <object width="' + obj.options.width + '" height="' + obj.options.height + '">' + 
                        '  <param name="movie" value="' + obj.youtube + '&enablejsapi=1&playerapiid=' + _playerId + '"></param>' + 
                        '  <param name="allowscriptaccess" value="always"></param>' + 
                        '  <param name="autoplay" value="' + _autoplay + '"></param>' + 
                        '  <param name="width" value="' + obj.options.width + '"></param>' + 
                        '  <param name="height" value="' + obj.options.height + '"></param>' + 
                        '  <embed src="' + obj.youtube + '&enablejsapi=1&playerapiid=' + _playerId + '"' + 
                        '    type="application/x-shockwave-flash"' + 
                        '    allowScriptAccess="always"' + 
                        '    autoplay="' + _autoplay + '"' + 
                        '    width="' + obj.options.width + '" height="' + obj.options.height + '"' + 
                        '    id="' + _playerId + '">' + 
                        '  </embed>' + 
                        '</object>' + 
                      '</div>'
            }
        }

        // Find the objects based on the individual player properties in the DOM
        // NOTE: Not currently in use. 
        this.microformat.find = function(html_dom) {
            var found = [];
            //SNOBBY:not embeds, since they're in objects--and not xhtml 'n' stuff
            var objects = ((html_dom.tagName.toLowerCase()=='object')
                    ? [html_dom] : html_dom.getElementsByTagName('object')
                      //function is case-insensitive in IE and FFox,at least
            );
            for(var i=0; i<objects.length; i++) {
                if (objects[i].getAttribute('id').search('youtube-player'))
                    found.push({'html':objects[i]});
            }
            return found;
        };
        
        // Return asset object description (parameters) in a serialized JSON format.
        // NOTE: Not currently in use. Will be used for things like printing, or spitting out a description.
        this.microformat.read = function(found_obj) {
            var obj = {};
            var params = found_obj.html.getElementsByTagName('param');
            for (var i=0;i<params.length;i++) {
                obj[params[i].getAttribute('name')] = params[i].getAttribute('value');
            }
            obj.url = obj.movie;
            obj.youtube = obj.movie;
            return obj;
        };
        
        // Replace the video identifier within the rendered .html
        this.microformat.update = function(obj,html_dom) {
            // Replacing the 'url' within an existing YouTube player requires decisions on  
            // autoplay, starttime, etc. As this is more a function for .media, I'm punting
            // for the moment on the update thread and allowing it to fall through to create. 
            return false;
        };

        this.media._getVideoId = function(ytplayer) {
            url = ytplayer.getVideoUrl();
            
            // the url returned by getVideoUrl doesn't work in cueVideo
            // ideally, i'd stash the url around someplace, but I'm not sure where at the moment
            // so, i'm just going to parse out the id from the rv of getVideoUrl
            // format: http://www.youtube.com/watch?v=MjdEEwzskck&feature=player_embedded
            startIdx = url.indexOf('v=') + 2;
            endIdx = url.indexOf('&', startIdx);
            youtubeId = url.slice(startIdx, endIdx);
            return youtubeId;
        }
        
        this.media._cueVideo = function(starttime) {
            ytplayer = document.getElementById(_playerId); // TODO -- getPlayer to wrap this 
            if (ytplayer) {
                youtubeId = self.media._getVideoId(ytplayer);
                
                if (_autoplay) {
                    ytplayer.loadVideoById(youtubeId, starttime);
                }
                else {
                    ytplayer.cueVideoById(youtubeId, starttime);
                }
            }
        }
        
        this.media._test = function() {
            try {
                ytplayer = document.getElementById(_playerId);
                if (ytplayer) {
                    state = ytplayer.getPlayerState();
                    return true;
                }
            }
            catch (e) {
            }
            return false;
        }
        
        this.media.movscale = 1; //movscale is a remnant from QT. vitalwrapper.js uses it. TODO: verify we need it.
       
        this.media.timestrip = function() {
            return {w:25,
                x:(16*2),
                visible:true
            };
        }

        this.media.play = function() {
            ytplayer = document.getElementById(_playerId);
            if (ytplayer) {
                ytplayer.playVideo();
            }
        }
        
        this.media.duration = function() {
            ytplayer = document.getElementById(_playerId);
            if (ytplayer) {
                duration = ytplayer.getDuration();
                if (duration < 0)
                    duration = 0
                return duration;
            }
        }
        
        this.media.time = function() {
            time = 0;
            ytplayer = document.getElementById(_playerId);
            if (ytplayer) {
                time = ytplayer.getCurrentTime();
                if (time < 0)
                    time = 0
            }
            return time;
        }

        this.media.seek = function(starttime, endtime) {
            // Queue up a "_cueVideo" call. The YT player is not yet ready
            ytplayer = document.getElementById(_playerId);
            
            self.events.queue('seek',[
                                      {test:self.media._test, poll:500},
                                      {data: starttime },
                                      {timeout: 2200}, //timeout to avoid seek competition
                                      {call: function() { self.media._cueVideo(starttime); }}
                                      ]);
            
            // Watch the video's running time & stop it when the endtime rolls around
            this.pauseAt(endtime);
        }
        
        this.media.pause = function() {
            ytplayer = document.getElementById(_playerId);
            if (ytplayer) {
                ytplayer.pauseVideo();
            }
        }

        this.media.pauseAt = function(endtime) {
            if (endtime) {
                self.events.queue('pause',[
                                          {test: function() { return self.media.time() >= endtime}, poll:500},
                                          {call: function() { self.media.pause(); }}
                                          ]);
            }
        }
    }
}