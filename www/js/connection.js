angular.module('mopidy-mobile.connection', [
  'ionic',
  'mopidy-mobile.coverart',
  'mopidy-mobile.util'
])

.provider('connection', function(util) {
  var provider = this;
  var loadingOptions = {
    delay: undefined,
    duration: undefined
  };

  var isUriRefRegExp = /^\//; // FIXME!!!

  angular.extend(provider, {
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
    $get: function(connectionErrorHandler, coverart, mopidy, $ionicLoading, $q, $rootScope) {
      var connectionSettings = {};
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

      function connect(settings) {
        // TODO: connectionSettings as private property?
        connectionSettings = angular.copy(settings || {});
        $ionicLoading.show();
        return mopidy(settings).then(
          function(mopidy) {
            connected = true;
            $ionicLoading.hide();
            notify.call(mopidy, 'connection:online');
            mopidy.on(notify.bind(mopidy));
            return mopidy;
          },
          function(mopidy) {
            connected = false;
            $ionicLoading.hide();
            notify.call(mopidy, 'connection:offline');
            throw {name: 'ConnectionError'};
          }
        );
      }

      function resolveURI(uri) {
        if (connectionSettings.webSocketUrl && isUriRefRegExp.test(uri)) {
          var match = /^ws:\/\/([^\/]+)/.exec(connectionSettings.webSocketUrl);
          return 'http://' + match[1] + uri;
        } else {
          return uri;
        }
      }

      var promise = connect();  // TODO: use settings for webSocketUrl, etc.

      var connection = function connection(callback) {
        $ionicLoading.show(loadingOptions);
        return promise.then(callback).finally(function() {
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
              promise.then(listener.apply.bind(listener));
            }
            break;
          case 'connection:offline':
            if (!connected) {
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
          promise.finally(function(mopidy) {
            mopidy.close();
            mopidy.off();
          });
          promise = connect(connectionSettings);
        },
        getImages: function(models) {
          return connection(function(mopidy) {
            // use Mopidy v1.0 getImages API if available
            if (mopidy.library.getImages) {
              // TODO: limit number of URIs per request?
              return mopidy.library.getImages({
                uris: models.map(function(model) { return model.uri; })
              });
            } else {
              var result = {};
              angular.forEach(models, function(model) {
                var images = (model.album ? model.album.images : model.images) || [];
                result[model.uri] = images.map(function(uri) {
                  return {__model__: 'Image,', uri: uri};
                });
              });
              return result;
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
                // most backends won't provide image dimensions
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
