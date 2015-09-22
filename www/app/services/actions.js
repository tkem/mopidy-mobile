;(function(module) {
  'use strict';

  module.factory('actions', function(connection, storage) {
    function addParams(obj, pos) {
      var params = {};
      if (angular.isArray(obj)) {
        if (obj.length && obj[0].__type__ === 'Track') {
          params.tracks = obj;
        } else {
          params.uris = obj.map(function(model) { return model.uri; });
        }
      } else {
        if (obj.__type__ === 'Track') {
          params.tracks = [obj];
        } else {
          params.uri = obj.uri;
        }
      }
      if (angular.isNumber(pos)) {
        params.at_position = pos;
      }
      return params;
    }

    var actions = {
      add: function(obj) {
        return connection(function(mopidy) {
          return mopidy.tracklist.add(addParams(obj));
        });
      },
      addToPlaylist: function(uri, obj) {
        return connection(function(mopidy) {
          return mopidy.library.lookup({uri: obj.uri}).then(function(tracks) {
            return tracks || [];
          }).then(function(tracks) {
            return mopidy.playlists.lookup({uri: uri}).then(function(playlist) {
              playlist.tracks = Array.prototype.concat(playlist.tracks || [], tracks);
              return playlist;
            });
          }).then(function(playlist) {
            return mopidy.playlists.save({playlist: playlist});
          });
        });
      },
      play: function(obj) {
        return connection(function(mopidy) {
          return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
            return tlTrack ? mopidy.tracklist.index({tl_track: tlTrack}) : null;
          }).then(function(index) {
            var pos = angular.isNumber(index) ? index + 1 : null;
            return mopidy.tracklist.add(addParams(obj, pos));
          }).then(function(tlTracks) {
            return mopidy.playback.play({tl_track: tlTracks[0]});
          });
        });
      },
      next: function(obj) {
        return connection(function(mopidy) {
          return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
            return tlTrack ? mopidy.tracklist.index({tl_track: tlTrack}) : null;
          }).then(function(index) {
            var pos = angular.isNumber(index) ? index + 1 : null;
            return mopidy.tracklist.add(addParams(obj, pos));
          });
        });
      },
      replace: function(obj) {
        return connection(function(mopidy) {
          // TODO: remember playback state?
          return mopidy.tracklist.clear().then(function() {
            return mopidy.tracklist.add(addParams(obj));
          }).then(function(tlTracks) {
            return mopidy.playback.play({tl_track: tlTracks[0]});
          });
        });
      },
    };

    // FIXME: remove storage dependency - check where default is used
    actions['default'] = function(obj) {
      return (actions[storage.get('action')] || actions.play)(obj);
    };

    return actions;
  });
})(angular.module('app.services.actions', ['app.services.connection', 'app.services.storage']));
