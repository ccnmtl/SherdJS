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
    log('onYouTubePlayerReady: ' + playerId)
}

if (!Sherd) {Sherd = {};}
if (!Sherd.Video) {Sherd.Video = {};}
if (!Sherd.Video.YouTube && Sherd.Video.Base) {
    Sherd.Video.YouTube = function() {
        var self = this;
        Sherd.Base.AssetView.apply(this,arguments); //inherit
        Sherd.Video.Base.apply(this,arguments); //inherit

        this.microformat = {}

        // create == asset->{html+information to make it}
        this.microformat.create = function(obj,doc) {
            var wrapperID = Sherd.Base.newID('youtube-wrapper');
            var playerId = Sherd.Base.newID('youtube-player');

            if (!obj.options) 
            {
                obj.options = {
                    width: 620, // youtube default
                    height: 440, // youtube default
                    playerId: playerId
                };
            }

            return {
                object:obj,
                htmlID:wrapperID,
                text: '<div id="'+wrapperID+'" class="sherd-youtube-wrapper">' + 
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
    }
}