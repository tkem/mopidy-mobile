angular.module('mopidy-mobile.connection', [])

.provider('connection', function() {
  function remove(array, obj) {
    for (var i = array.length - 1; i >= 0; --i) {
      if (array[i] === obj) {
        array.splice(i, 1);
      }
    }
    return array;
  }

  function zipObject(keys, values) {
    var obj = {};
    for (var i = 0, length = keys.length; i !== length; ++i) {
      obj[keys[i]] = values[i];
    }
    return obj;
  }

  var provider = this;
  var settings = {
    autoConnect: false,
    callingConvention: 'by-position-or-by-name'
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

  provider.$get = function($q, $log, $rootScope, $window, $ionicLoading, connectionErrorHandler) {
    var listeners = {};

    var connect = function(mopidy) {
      var slice = Array.prototype.slice;
      var concat = Array.prototype.concat;
      var promise = $q(function(resolve, reject) {
        $ionicLoading.show();
        mopidy.once('state:online', function() {
          // add convenience methods/decorators
          var library = angular.copy(mopidy.library);
          var tracklist = angular.copy(mopidy.tracklist);
          angular.extend(mopidy.library, {
            lookup: function(params) {
              if ('uris' in params) {
                return Mopidy.when.all(params.uris.map(function(uri) {
                  return library.lookup({uri: uri});
                })).then(function(results) {
                  return concat.apply([], results);
                });
              } else {
                return library.lookup(params);
              }
            }
          });
          angular.extend(mopidy.tracklist, {
            add: function(params) {
              if ('uris' in params) {
                return mopidy.library.lookup({
                  uris: params.uris
                }).then(function(tracks) {
                  if ('at_position' in params) {
                    return tracklist.add({tracks: tracks, at_position: params.at_position});
                  } else {
                    return tracklist.add({tracks: tracks});
                  }
                });
              } else {
                return tracklist.add(params);
              }
            },
            getOptions: function() {
              return Mopidy.when.all([
                tracklist.getConsume(),
                tracklist.getRandom(),
                tracklist.getRepeat(),
                tracklist.getSingle()
              ]).then(function(results) {
                return zipObject(['consume', 'random', 'repeat', 'single'], results);
              });
            },
            setOptions: function(params) {
              var promises = [];
              if ('consume' in params) {
                promises.push(tracklist.setConsume({value: params.consume}));
              }
              if ('random' in params) {
                promises.push(tracklist.setRandom({value: params.random}));
              }
              if ('repeat' in params) {
                promises.push(tracklist.setRepeat({value: params.repeat}));
              }
              if ('single' in params) {
                promises.push(tracklist.setSingle({value: params.single}));
              }
              return Mopidy.when.all(promises);
            }
          });
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
    var connection;
    var pending = 0;
    connection = function(callback) {
      if (callback) {
        if (pending++ === 0) {
          $ionicLoading.show();
        }
        return $q.when(promise.then(callback).finally(function() {
          if (--pending === 0) {
            $ionicLoading.hide();
          }
        })).catch(function(error) {
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
          remove(listeners[obj], listener);
        }
      },
      reset: function() {
        $log.warn('Reconnecting...');
        mopidy.close();
        mopidy.off();
        mopidy = new Mopidy(settings);
        promise = connect(mopidy);
      },
      resolveURI: function(uri) {
        if (settings.webSocketUrl && isUriRefRegExp.test(uri)) {
          var match = /^ws:\/\/([^\/]+)/.exec(settings.webSocketUrl);
          return 'http://' + match[1] + uri;
        } else {
          return uri;
        }
      },
      test: function(webSocketUrl) {
        return $q(function(resolve, reject) {
          // FIXME: report as true/false, close mopidy object?
          var mopidy = new Mopidy(angular.extend({}, settings, {webSocketUrl: webSocketUrl}));
          mopidy.once('state:online', function() {
            resolve(mopidy);
          });
          mopidy.once('state:offline', function() {
            reject({name: 'ConnectionError'});
          });
          mopidy.connect();
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
