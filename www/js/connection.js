angular.module('mopidy-mobile.connection', [
  'ionic',
  'mopidy-mobile.coverart',
  'mopidy-mobile.mopidy',
  'mopidy-mobile.util'
])

.provider('connection', function(util) {
  var loadingOptions = {
    delay: undefined,
    duration: undefined
  };
  var settings = {
    // TBD
  };

  angular.extend(this, {
    backoffDelayMin: function(value) {
      if (arguments.length) {
        settings.backoffDelayMin = value;
      } else {
        return settings.backoffDelayMin;
      }
    },
    backoffDelayMax: function(value) {
      if (arguments.length) {
        settings.backoffDelayMax = value;
      } else {
        return settings.backoffDelayMax;
      }
    },
    loadingDelay: function(value) {
      if (arguments.length) {
        loadingOptions.delay = value;
      } else {
        return loadingOptions.delay;
      }
    },
    loadingDuration: function(value) {
      if (arguments.length) {
        loadingOptions.duration = value;
      } else {
        return loadingOptions.duration;
      }
    },
    // TODO: pass as param to connect()?
    webSocketUrl: function(value) {
      if (arguments.length) {
        settings.webSocketUrl = value;
      } else {
        return settings.webSocketUrl;
      }
    },
    $get: function(connectionErrorHandler, coverart, mopidy, $ionicLoading, $log, $q, $rootScope) {
      var connected = false;
      var listeners = {};

      function notify(event) {
        var mopidy = this;
        var handlers = listeners[event] || [];
        var args = Array.prototype.slice.call(arguments, 1);
        switch (event) {
        case 'state:online':
          handlers = handlers.concat(listeners['connection:online'] || []);
          connected = true;
          break;
        case 'state:offline':
          handlers = handlers.concat(listeners['connection:offline'] || []);
          connected = false;
          break;
        }
        $rootScope.$applyAsync(function() {
          for (var i = 0, length = handlers.length; i !== length; ++i) {
            handlers[i].apply(mopidy, args);
          }
        });
      }

      function connect() {
        $ionicLoading.show();
        return mopidy(settings).then(
          function(mopidy) {
            connected = true;
            $log.debug('hide loading');
            $ionicLoading.hide();
            notify.call(mopidy, 'connection:online');
            mopidy.on(notify.bind(mopidy));
            return mopidy;
          },
          function(mopidy) {
            connected = false;
            $log.debug('hide loading');
            $ionicLoading.hide();
            notify.call(mopidy, 'connection:offline');
            throw {name: 'ConnectionError'};
          }
        );
      }

      function resolveURI(uri) {
        if (settings.webSocketUrl && uri.charAt(0) == '/') {
          var match = /^wss?:\/\/([^\/]+)/.exec(settings.webSocketUrl);
          return 'http://' + match[1] + uri;
        } else {
          return uri;
        }
      }

      var promise = connect();  // TODO: use settings for webSocketUrl, etc.

      var connection = function connection(callback) {
        // FIXME: handle pending count?
        $ionicLoading.show(loadingOptions);
        return promise.then(callback).finally(function() {
          $log.debug('hide loading');
          $ionicLoading.hide();
        }).catch(function(error) {
          return connectionErrorHandler(error, connection, callback);
        });
      };

      return angular.extend(connection, {
        on: function on(obj, listener) {
          if (listener === undefined) {
            return angular.forEach(obj, function(value, key) { on(key, value); });
          } else if (obj in listeners) {
            listeners[obj].push(listener);
          } else {
            listeners[obj] = [listener];
          }
          switch (obj) {
          case 'connection:online':
            if (connected) {
              // FIXME: check this, e.g. event params
              promise.then(listener.apply.bind(listener));
            }
            break;
          case 'connection:offline':
            if (!connected) {
              // FIXME: promise.catch for symmetry?
              listener();
            }
            break;
          }
          return listener;
        },
        off: function off(obj, listener) {
          if (listener === undefined) {
            angular.forEach(obj, function(value, key) { off(key, value); });
          } else if (obj in listeners) {
            util.remove(listeners[obj], listener);
          }
        },
        reset: function() {
          // FIXME: check mopidy.close() behavior when not connected
          promise.finally(function(mopidy) {
            mopidy.close();
            mopidy.off();
          });
          promise = connect(settings);
        },
        getImages: function(models) {
          // works "in background", so no loading shown
          return promise.then(function(mopidy) {
            return mopidy.library.getImages({
              uris: models.map(function(model) { return model.uri; })
            });
          }).then(function(result) {
            var promises = {};
            angular.forEach(result, function(images, uri) {
              if (!images || !images.length) {
                //$log.debug('Mopidy found no images for ' + uri);
              } else if (images.length === 1) {
                //$log.debug('Mopidy found one image for ' + uri);
                // common case: single image, no need for width/height
                promises[uri] = [angular.extend(images[0], {
                  uri: resolveURI(images[0].uri)
                })];
              } else {
                //$log.debug('Mopidy found ' + images.length + ' images for ' + uri);
                // most backends won't provide image dimensions anytime soon
                promises[uri] = $q.all(images.map(function(image) {
                  image.uri = resolveURI(image.uri);
                  if (!image.width || !image.height) {
                    return coverart.resolveImage(image.uri);
                  } else {
                  return image;
                  }
                }));
              }
            });
            return $q.all(promises);
          });
        }
      });
    },
    loadingOptions: function(value) {
      if (arguments.length) {
        angular.extend(loadingOptions, value);
      } else {
        return angular.copy(loadingOptions);
      }
    },
    settings: function(value) {
      if (arguments.length) {
        angular.extend(settings, value);
      } else {
        return angular.copy(settings);
      }
    }
  });
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
