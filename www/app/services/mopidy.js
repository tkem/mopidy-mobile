;(function(module) {
  'use strict';

  function fromKeys(keys, value) {
    var obj = {};
    for (var i = keys.length - 1; i >= 0; --i) {
      obj[keys[i]] = angular.isFunction(value) ? value(keys[i]) : value;
    }
    return obj;
  }

  function zipObject(keys, values) {
    var obj = {};
    for (var i = 0, length = keys.length; i !== length; ++i) {
      obj[keys[i]] = values[i];
    }
    return obj;
  }

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
    // Mopidy v1.0 library.lookup({uris: [...]})
    if (!hasParam(mopidy.library.lookup, 'uris')) {
      var lookup = mopidy.library.lookup;
      mopidy.library.lookup = function(params) {
        if ('uris' in params) {
          return Mopidy.when.all(params.uris.map(function(uri) {
            return lookup({uri: uri});
          })).then(function(results) {
            return zipObject(params.uris, results);
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
    // Mopidy v1.0 library.lookup({exact: true|false})
    if (!hasParam(mopidy.library.search, 'exact')) {
      var search = mopidy.library.search;
      mopidy.library.search = function(params) {
        if (params.exact) {
          return mopidy.library.findExact({query: params.query, uris: params.uris});
        } else {
          return search({query: params.query, uris: params.uris});
        }
      };
    }
    // additional Mopidy v1.0/v1.1 (or possibly future) API features
    angular.forEach({
      tracklist: {
        getEotTlid: function() {
          return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
            return mopidy.tracklist.eotTrack({tl_track: tlTrack});
          }).then(function(tlTrack) {
            return tlTrack ? tlTrack.tlid : null;
          });
        },
        getNextTlid: function() {
          return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
            return mopidy.tracklist.nextTrack({tl_track: tlTrack});
          }).then(function(tlTrack) {
            return tlTrack ? tlTrack.tlid : null;
          });
        },
        getPreviousTlid: function() {
          return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
            return mopidy.tracklist.previousTrack({tl_track: tlTrack});
          }).then(function(tlTrack) {
            return tlTrack ? tlTrack.tlid : null;
          });
        },
        // FIXME: see https://github.com/mopidy/mopidy/issues/977
        getOptions: function() {
          return Mopidy.when.all([
            mopidy.tracklist.getConsume(),
            mopidy.tracklist.getRandom(),
            mopidy.tracklist.getRepeat(),
            mopidy.tracklist.getSingle()
          ]).then(function(results) {
            return zipObject(['consume', 'random', 'repeat', 'single'], results);
          });
        }
      },
      playback: {
        getCurrentTlid: function() {
          return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
            return tlTrack ? tlTrack.tlid : null;
          });
        },
        getStreamTitle: function() {
          return Mopidy.when(null);
        }
      },
      library: {
        getImages: function(params) {
          return mopidy.library.lookup(params).then(function(result) {
            var images = {};
            angular.forEach(result, function(tracks, uri) {
              var uris = {};
              tracks.forEach(function(track) {
                if (track.album && track.album.images) {
                  angular.extend(uris, fromKeys(track.album.images));
                }
              });
              images[uri] = Object.keys(uris).map(function(uri) {
                return {__model__: 'Image', uri: uri};
              });
            });
            return images;
          });
        }
      },
      playlists: {
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
        editable: !!mopidy.playlists.asList  // FIXME: Mopidy >= 1.0
      },
      mixer: {
        getMute: mopidy.playback.getMute,
        setMute: function(params) {
          return mopidy.playback.setMute({value: params.mute});
        },
        getVolume: mopidy.playback.getVolume,
        setVolume: mopidy.playback.setVolume
      }
    }, function(value, key) {
      mopidy[key] = angular.extend(value, mopidy[key] || {});
    });
    return mopidy;
  }

  /* @ngInject */
  module.factory('mopidy', function($log, $q, $timeout) {

    function logEvent() {
      $log.debug.apply($log, Array.prototype.slice.call(arguments).map(function(obj) {
        if (obj instanceof MessageEvent && obj.data) {
          return angular.fromJson(obj.data);
        } else {
          return obj;
        }
      }));
    }

    return function(settings, timeout) {
      return $q(function(resolve, reject) {
        var mopidy = new Mopidy(angular.extend({}, settings || {}, {
          autoConnect: false,
          callingConvention: 'by-position-or-by-name'
        }));
        var timeoutPromise = timeout ? $timeout(function() {
          reject(new Mopidy.ConnectionError('Connection timeout'));
          timeoutPromise = reject = resolve = null;
          mopidy.close();
          mopidy.off();
        }, timeout) : null;
        // .once() listeners are wrapped, so .off() doesn't work
        mopidy.once('state:online', function() {
          if (timeoutPromise) {
            $timeout.cancel(timeoutPromise);
          }
          if (resolve) {
            reject = null;
            $log.info('Connected');
            resolve(shim(mopidy));
          }
        });
        mopidy.once('state:offline', function() {
          if (timeoutPromise) {
            $timeout.cancel(timeoutPromise);
          }
          if (reject) {
            reject(new Mopidy.ConnectionError());
            mopidy.close();
            mopidy.off();
          }
        });
        if (settings && settings.webSocketUrl) {
          $log.info('Connecting to ' + settings.webSocketUrl);
        } else {
          $log.info('Connecting to default WebSocket');
        }
        mopidy.on(logEvent);
        mopidy.connect();
      });
    };
  });

})(angular.module('app.services.mopidy', []));
