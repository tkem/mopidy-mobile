angular.module('mopidy-mobile.actions', [
  'mopidy-mobile.connection',
  'mopidy-mobile.settings'
])

.factory('actions', function(connection, settings) {
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

  actions['default'] = function(obj) {
    return (actions[settings.get('action', 'play')] || actions.play)(obj);
  };

  return actions;
});
