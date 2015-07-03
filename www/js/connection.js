angular.module('mopidy-mobile.connection', [
  'ionic',
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
    $get: function(connectionErrorHandler, coverart, mopidy, $ionicLoading, $log, $q, $timeout, $rootScope) {
      var connected = false;
      var listeners = {};
      var pending = 0;

      function notify(event) {
        var mopidy = this;
        var handlers = listeners[event] || [];
        var args = Array.prototype.slice.call(arguments, 1);
        switch (event) {
        case 'state:online':
          $log.info('Mopidy connection online');
          handlers = handlers.concat(listeners['connection:online'] || []);
          connected = true;
          break;
        case 'state:offline':
          $log.warn('Mopidy connection offline');
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

      var promise = null;

      var connection = function connection(callback) {
        if (callback) {
          if (pending++ === 0) {
            $ionicLoading.show(loadingOptions);
          }
          return promise.then(callback).finally(function() {
            if (--pending === 0) {
              // see http://forum.ionicframework.com/t/ionicloading-bug/8001
              if (loadingOptions.delay) {
                $timeout(function() {
                  var body = angular.element(document.body);
                  if (!pending && body.hasClass('loading-active')) {
                    $log.debug('Loading overlay still active!');
                    $ionicLoading.hide();
                  }
                }, loadingOptions.delay);
              }
              $ionicLoading.hide();
            } else {
              $log.debug('Requests pending: ' + pending);
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
        reset: function(webSocketUrl) {
          if (promise) {
            promise.finally(function(mopidy) {
              mopidy.close();
              mopidy.off();
            });
          }
          if (webSocketUrl) {
            settings.webSocketUrl = webSocketUrl;
          }
          promise = connect(settings);
          return promise;
        },
        settings: function() {
          return promise.then(function() {
            return settings;
          });
        },
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
