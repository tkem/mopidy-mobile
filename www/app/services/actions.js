;(function(module) {
  'use strict';

  function addParams(obj, pos) {
    var params = {};
    if (angular.isArray(obj)) {
      params.uris = obj.map(function(model) { return model.uri; });
    } else {
      params.uris = [obj.uri];
    }
    if (angular.isNumber(pos)) {
      params.at_position = pos;
    }
    return params;
  }

  var defaultAction = 'play';
  var volumeStep = 10;

  /* @ngInject */
  module.service('actions', function(connection) {
    this.add = function(obj) {
      return connection(function(mopidy) {
        return mopidy.tracklist.add(addParams(obj));
      });
    };

    this.addToPlaylist = function(uri, obj) {
      return connection(function(mopidy) {
        return mopidy.library.lookup({uris: [obj.uri]}).then(function(result) {
          return result[obj.uri];
        }).then(function(tracks) {
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
    };

    this.play = function(obj) {
      return connection(function(mopidy) {
        return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
          return tlTrack ? mopidy.tracklist.index({tl_track: tlTrack}) : null;
        }).then(function(index) {
          var pos = angular.isNumber(index) ? index + 1 : null;
          return mopidy.tracklist.add(addParams(obj, pos));
        }).then(function(tlTracks) {
          return mopidy.playback.play({tlid: tlTracks[0].tlid});
        });
      });
    };

    this.next = function(obj) {
      return connection(function(mopidy) {
        return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
          return tlTrack ? mopidy.tracklist.index({tl_track: tlTrack}) : null;
        }).then(function(index) {
          var pos = angular.isNumber(index) ? index + 1 : null;
          return mopidy.tracklist.add(addParams(obj, pos));
        });
      });
    };

    this.replace = function(obj) {
      return connection(function(mopidy) {
        // TODO: remember playback state?
        return mopidy.tracklist.clear().then(function() {
          return mopidy.tracklist.add(addParams(obj));
        }).then(function(tlTracks) {
          return mopidy.playback.play({tlid: tlTracks[0].tlid});
        });
      });
    };

    this.increaseVolume = function() {
      return connection(function(mopidy) {
        return mopidy.mixer.getVolume().then(function(volume) {
          if (volume < 100) {
            return mopidy.mixer.setVolume({volume: Math.min(volume + volumeStep, 100)});
          }
        });
      });
    };

    this.decreaseVolume = function() {
      return connection(function(mopidy) {
        return mopidy.mixer.getVolume().then(function(volume) {
          if (volume > 0) {
            return mopidy.mixer.setVolume({volume: Math.max(volume - volumeStep, 0)});
          }
        });
      });
    };

    this.default = function(obj) {
      return this[defaultAction](obj);
    };

    this.getDefault = function() {
      return defaultAction;
    };

    this.setDefault = function(action) {
      defaultAction = action;
    };

    this.getVolumeStep = function() {
      return volumeStep;
    };

    this.setVolumeStep = function(value) {
      volumeStep = value;
    };
  });

})(angular.module('app.services.actions', ['app.services.connection']));
