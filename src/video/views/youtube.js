/*
  support for the YouTube js-enabled player.  documentation at:
  http://code.google.com/apis/youtube/js_api_reference.html
  http://code.google.com/apis/youtube/chromeless_example_1.html

  TODO: UNREQUIRE  dependency: Clipper() WaitUntil()
  TODO: implement AssetView

  http://localhost:8000/save/?url=http%3A//www.youtube.com/v/OdBNxqJ-_60&title=Night%20Parkour&youtube=http%3A//www.youtube.com/v/OdBNxqJ-_60&poster=http%3A//www.youtube.com/v/OdBNxqJ-_60
 */

// global function required to catch YouTube player ready event
function onYouTubePlayerReady(playerId) {
    log('onYouTubePlayerReady: ' + playerId);
}

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.YouTube && Sherd.Video.Base) {
    Sherd.Video.YouTube = function() {
        var self = this;
        Sherd.Base.AssetView.apply(this,arguments); //inherit -- base.js
        Sherd.Video.Base.apply(this,arguments); //inherit -- video.js
        
        // override create == asset->{html+information to make it}
        this.microformat.create = function(obj,doc) {
            var wrapperId = Sherd.Base.newID('youtube-wrapper');
            var playerId = 'youtube-player'
            
            if (!obj.options) 
            {
                obj.options = {
                    width: 620, // youtube default
                    height: 440, // youtube default
                    playerId: playerId,
                    wrapperId: wrapperId
                };
            }

            return {
                object: obj,
                htmlID: wrapperId,
                text: '<div id="' + wrapperId + '" class="sherd-youtube-wrapper">' + 
                      '  <object width="' + obj.options.width + '" height="' + obj.options.height + '">' + 
                        '  <param name="movie" value="' + obj.youtube + '&enablejsapi=1&playerapiid=' + playerId + '"></param>' + 
                        '  <param name="allowscriptaccess" value="always"></param>' + 
                        '  <embed src="' + obj.youtube + '&enablejsapi=1&playerapiid=' + playerId + '"' + 
                        '    type="application/x-shockwave-flash"' + 
                        '    allowScriptAccess="always"' + 
                        '    width="' + obj.options.width + '" height="' + obj.options.height + '"' + 
                        '    id="' + playerId + '">' + 
                        '  </embed>' + 
                        '</object>' + 
                      '</div>'
            }
        }
        
        this.media._cueVideo = function(seconds) {
            ytplayer = document.getElementById('youtube-player');
            if (ytplayer) {
                url = ytplayer.getVideoUrl();
                
                // the url returned by getVideoUrl doesn't work in cueVideo
                // ideally, i'd stash the url around someplace, but I'm not sure where at the moment
                // so, i'm just going to parse out the id from the rv of getVideoUrl
                // format: http://www.youtube.com/watch?v=MjdEEwzskck&feature=player_embedded
                startIdx = url.indexOf('v=') + 2;
                endIdx = url.indexOf('&', startIdx);
                ytplayer.cueVideoById(url.slice(startIdx, endIdx), seconds);
            }
        }
        
        this.media._test = function() {
            try {
                ytplayer = document.getElementById('youtube-player');
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
            ytplayer = document.getElementById('youtube-player');
            if (ytplayer) {
                ytplayer.playVideo();
            }
        }
        
        this.media.duration = function() {
            ytplayer = document.getElementById('youtube-player');
            if (ytplayer) {
                duration = ytplayer.getDuration();
                if (duration < 0)
                    duration = 0
                return duration;
            }
        }
        
        this.media.time = function() {
            time = 0;
            ytplayer = document.getElementById('youtube-player');
            if (ytplayer) {
                time = ytplayer.getCurrentTime();
                if (time < 0)
                    time = 0
            }
            return time;
        }

        this.media.seek = function(seconds) {
            // Queue up a "_cueVideo" call. The YT player is not yet ready
            self.events.queue('seek',[
                                      {test:self.media._test, poll:500},
                                      {data: seconds },
                                      {timeout: 2200}, //timeout to avoid seek competition
                                      {call: function() { self.media._cueVideo(seconds); }}
                                      ]);
        }
        
        this.media.pause = function() {
            ytplayer = document.getElementById('youtube-player');
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