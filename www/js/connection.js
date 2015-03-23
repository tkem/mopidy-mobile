angular.module('mopidy-mobile.connection', [
  'mopidy-mobile.coverart',
  'mopidy-mobile.util'
])

.provider('connection', function() {
  var provider = this;
  var settings = {
    autoConnect: false,
    callingConvention: 'by-position-or-by-name'
  };
  var loadingOptions = {
    delay: 100  // TODO: configurable?
  };
  var isUriRefRegExp = /^\//; // FIXME!!!

  provider.settings = {
    backoffDelayMin: function(value) {
      settings.backoffDelayMin = value;
    },
    backoffDelayMax: function(value) {
      settings.backoffDelayMax = value;
    },
    webSocketUrl: function(value) {
      settings.webSocketUrl = value;
    }
  };

  provider.$get = function($q, $log, $rootScope, $window, $ionicLoading, connectionErrorHandler, coverart, util) {
    function shim(mopidy) {
      function hasParam(method, name) {
        for (var params = method.params, i = params.length - 1; i >= 0; --i) {
          if (params[i].name === name) {
            return true;
          }
        }
        return false;
      }
      // Mopidy v1.0 mixer API
      mopidy.mixer = mopidy.mixer || {
        getMute: mopidy.playback.getMute,
        setMute: mopidy.playback.setMute,
        getVolume: mopidy.playback.getVolume,
        setVolume: mopidy.playback.setVolume
      };
      // Mopidy v1.0 library.lookup(uris)
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
      // Mopidy v1.0 tracklist.add(uris)
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

    function resolveURI(uri) {
      if (settings.webSocketUrl && isUriRefRegExp.test(uri)) {
        var match = /^ws:\/\/([^\/]+)/.exec(settings.webSocketUrl);
        return 'http://' + match[1] + uri;
      } else {
        return uri;
      }
    }

    function resolveImage(image) {
      image.uri = resolveURI(image.uri);
      if (!image.width || !image.height) {
        return coverart.resolveImage(image.uri);
      } else {
        return image;
      }
    }

    function getModelImages(models) {
      var result = {};
      angular.forEach(models, function(model) {
        var images = (model.album ? model.album.images : model.images) || [];
        result[model.uri] = images.map(function(uri) {
          return {__model__: 'Image,', uri: uri};
        });
      });
      return result;
    }

    var listeners = {};

    var connect = function(mopidy) {
      var slice = Array.prototype.slice;
      var promise = $q(function(resolve, reject) {
        $ionicLoading.show();

        mopidy.once('state:online', function() {
          mopidy = shim(mopidy);
          $log.info('Connected');
          $ionicLoading.hide();
          resolve(mopidy);
        });
        mopidy.once('state:offline', function() {
          $log.error('Connection failed');
          $ionicLoading.hide();
          reject({name: 'ConnectionError'});
        });
      });

      mopidy.on(function(name) {
        var handlers = listeners[name];
        //$log.warn('event: ' + name + ' - handlers: ' + handlers + ', listeners: ', listeners);
        if (handlers) {
          var args = slice.call(arguments, 1);
          $rootScope.$applyAsync(function() {
            for (var i = 0, length = handlers.length; i !== length; ++i) {
              handlers[i].apply(mopidy, args);
            }
          });
        }
      });
      mopidy.on($log.debug.bind($log));
      mopidy.connect();
      return promise;
    };

    $log.info('Creating Mopidy instance for ' + settings.webSocketUrl);

    var mopidy = new Mopidy(settings);
    var promise = connect(mopidy);
    var connection = function connection(callback, showLoading) {
      if (callback) {
        if (showLoading) {
          $ionicLoading.show(loadingOptions);
        }
        return $q.when(promise.then(callback)).finally(function() {
          if (showLoading) {
            $ionicLoading.hide();
          }
        }).catch(function(error) {
          return connectionErrorHandler(error, connection, callback);
        });
      } else {
        return promise;
      }
    };

    return angular.extend(connection, {
      on: function on(obj, listener) {
        //$log.info('on', obj, listener);
        if (listener === undefined) {
          return angular.forEach(obj, function(value, key) { on(key, value); });
        } else if (obj in listeners) {
          listeners[obj].push(listener);
          return listener;
        } else {
          listeners[obj] = [listener];
          return listener;
        }
      },
      off: function off(obj, listener) {
        if (listener === undefined) {
          angular.forEach(obj, function(value, key) { off(key, value); });
        } else if (obj in listeners) {
          util.remove(listeners[obj], listener);
        }
      },
      reset: function() {
        $log.warn('Reconnecting...');
        mopidy.close();
        mopidy.off();
        mopidy = new Mopidy(settings);
        promise = connect(mopidy);
      },
      getImages: function(models) {
        return connection(function(mopidy) {
          // use Mopidy v0.20 getImages API if available
          if (mopidy.library.getImages) {
            // TODO: limit number of URIs per request?
            return mopidy.library.getImages({
              uris: models.map(function(model) { return model.uri; })
            });
          } else {
            return getModelImages(models);
          }
        }).then(function(result) {
          var promises = {};
          angular.forEach(result, function(images, uri) {
            if (!images || !images.length) {
              //$log.debug('No images found for ' + uri);
            } else if (images.length === 1) {
              promises[uri] = [angular.extend(images[0], {
                uri: resolveURI(images[0].uri)
              })];
            } else {
              // most backends won't provide image dimensions anytime soon...
              promises[uri] = $q.all(images.map(resolveImage));
            }
          });
          return $q.all(promises);
        });
      }
    });
  };
})

.factory('connectionErrorHandler', function($log) {
  return function(error/*, connection, callback*/) {
    if (error.name && error.message) {
      $log.error(error.name + ': ' + error.message, error);
    } else if (error.name) {
      $log.error(error.name, error);
    } else {
      $log.error('Error', error);
    }
    throw error;
  };
});
