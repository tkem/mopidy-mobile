angular.module('mopidy-mobile.mopidy', [
  'mopidy-mobile.util'
])

.provider('mopidy', function(util) {
  var provider = this;

  function shim(mopidy) {
    // check if Mopidy method has given named parameter
    function hasParam(method, name) {
      for (var params = method.params, i = params.length - 1; i >= 0; --i) {
        if (params[i].name === name) {
          return true;
        }
      }
      return false;
    }
    // convert Mopidy model instance to corresponding Ref
    function toRef(model) {
      return {
        __model__: 'Ref',
        type: model.__model__.toLowerCase(),
        name: model.name,
        uri: model.uri
      };
    }

    mopidy.mixer = mopidy.mixer || {
      getMute: mopidy.playback.getMute,
      setMute: function(params) {
        return mopidy.playback.setMute({value: params.mute});
      },
      getVolume: mopidy.playback.getVolume,
      setVolume: mopidy.playback.setVolume
    };
    mopidy.library = angular.extend({
      getImages: function(params) {
        return mopidy.library.lookup(params).then(function(result) {
          var images = {};
          angular.forEach(result, function(tracks, uri) {
            var uris = {};
            tracks.forEach(function(track) {
              if (track.album && track.album.images) {
                angular.extend(uris, util.fromKeys(track.album.images));
              }
            });
            images[uri] = Object.keys(uris).map(function(uri) {
              return {__model__: 'Image', uri: uri};
            });
          });
          return images;
        });
      }
    }, mopidy.library);
    mopidy.playback = angular.extend({
      getStreamTitle: function() {
        return null;
      }
    }, mopidy.playback);
    mopidy.playlists = angular.extend({
      asList: function() {
        return mopidy.playlists.getPlaylists().then(function(playlists) {
          return playlists.map(toRef);
        });
      },
      getItems: function(params) {
        return mopidy.playlists.lookup({uri: params.uri}).then(function(playlist) {
          return playlist ? playlist.tracks.map(toRef) : playlist;
        });
      },
      editable: !!mopidy.playlists.asList  // Mopidy >= 1.0
    }, mopidy.playlists);


    // Mopidy v1.0 library.lookup({uris: [...]})
    if (!hasParam(mopidy.library.lookup, 'uris')) {
      var lookup = mopidy.library.lookup;
      mopidy.library.lookup = function(params) {
        if ('uris' in params) {
          return Mopidy.when.all(params.uris.map(function(uri) {
            return lookup({uri: uri});
          })).then(function(results) {
            return util.zipObject(params.uris, results);
          });
        } else {
          return lookup(params);
        }
      };
    }
    // Mopidy v1.0 tracklist.add({uris: [...]})
    if (!hasParam(mopidy.tracklist.add, 'uris')) {
      var add = mopidy.tracklist.add;
      mopidy.tracklist.add = function(params) {
        if ('uris' in params) {
          return mopidy.library.lookup({
            uris: params.uris
          }).then(function(result) {
            return Array.prototype.concat.apply([], params.uris.map(function(uri) {
              return result[uri] || [];
            }));
          }).then(function(tracks) {
            if ('at_position' in params) {
              return add({tracks: tracks, at_position: params.at_position});
            } else {
              return add({tracks: tracks});
            }
          });
        } else {
          return add(params);
        }
      };
    }
    // Mopidy getOptions API (TBD)
    mopidy.tracklist.getOptions = function() {
      return Mopidy.when.all([
        mopidy.tracklist.getConsume(),
        mopidy.tracklist.getRandom(),
        mopidy.tracklist.getRepeat(),
        mopidy.tracklist.getSingle()
      ]).then(function(results) {
        return util.zipObject(['consume', 'random', 'repeat', 'single'], results);
      });
    };
    return mopidy;
  }

  angular.extend(provider, {
    $get: function($q, $log) {
      return function(settings) {
        return $q(function(resolve, reject) {
          var mopidy = new Mopidy(angular.extend({}, settings || {}, {
            autoConnect: false,
            callingConvention: 'by-position-or-by-name'
          }));
          // .once() listeners are wrapped, so .off() doesn't work
          mopidy.once('state:online', function() {
            if (resolve) {
              reject = null;
              $log.info('Connected');
              resolve(shim(mopidy));
            }
          });
          mopidy.once('state:offline', function() {
            if (reject) {
              resolve = null;
              $log.error('Connection error');
              mopidy.close();
              reject(mopidy);
            }
          });
          if (settings && settings.webSocketUrl) {
            $log.info('Connecting to ' + settings.webSocketUrl);
          } else {
            $log.info('Connecting to default WebSocket');
          }
          mopidy.on($log.debug.bind($log));
          mopidy.connect();
        });
      };
    }
  });
});
