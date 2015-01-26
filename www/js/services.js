angular.module('app.services', [])

.provider('Config', function() {
  var provider = this;
  provider.get = function(key, defaultValue) {
    if (key in window.localStorage) {
      return window.localStorage[key];
    } else {
      return defaultValue;
    }
  };
  provider.set = function(key, value) {
    window.localStorage[key] = value;
  };
  provider.$get = function() {
    return provider;
  };
})

.provider('Mopidy', function() {
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
  provider.isWebExtension = function() {
    var scripts = window.document.scripts;
    for (var i = 0; i != scripts.length; ++i) {
      // FIXME: this is a hack!
      if (/\/mopidy\/mopidy\.(min\.)?js$/.test(scripts[i].src || '')) {
        return true;
      }
    }
    return false;
  };

  provider.$get = function($q, $log, $ionicLoading) {
    var mopidy = new Mopidy(settings);
    var pending = {};
    var reconnects = 0;
    mopidy.on($log.debug.bind($log));
    mopidy.on('websocket:outgoingMessage', function(event) {
      $ionicLoading.show();  // FIXME: template, delay?
      pending[event.id] = event;
    });
    mopidy.on('websocket:incomingMessage', function(event) {
      var data = angular.fromJson(event.data);
      if (data.id in pending) {
        delete pending[data.id];
        $ionicLoading.hide();
      }
      reconnects = 0;
    });
    // FIXME: improve reconnect handling
    mopidy.on('reconnectionPending', function(event) {
      if (++reconnects > 3) {
        location.hash = '';
        location.reload(true);
      }
    });

    var promise = $q(function(resolve/*, reject*/) {
      mopidy.once('state:online', function() {
        function makeObject(keys, values) {
          var obj = {};
          for (var i = 0, length = keys.length; i !== length; ++i) {
            obj[keys[i]] = values[i];
          }
          return obj;
        }

        // FIXME: see https://github.com/mopidy/mopidy.js/issues/1
        var all = mopidy.getVersion().__proto__.constructor.all;
        // convenience methods
        angular.extend(mopidy, {
          all: all,
	  join: function(/* promises */) {
	    return all(arguments);
	  },
          resolveURI: function(uri) {
            if (settings.webSocketUrl && isUriRefRegExp.test(uri)) {
              var match = /^ws:\/\/([^\/]+)/.exec(settings.webSocketUrl);
              return 'http://' + match[1] + uri;
            }
            return uri;
          }
        });
        angular.extend(mopidy.tracklist, {
          tracks: function(params) {
            return mopidy.join(
              mopidy.tracklist.eotTrack(params),
              mopidy.tracklist.nextTrack(params),
              mopidy.tracklist.previousTrack(params)
            ).then(function(results) {
              return makeObject(['eot', 'next', 'previous'], results);
            });
          },
          getOptions: function() {
            return mopidy.join(
              mopidy.tracklist.getConsume(),
              mopidy.tracklist.getRandom(),
              mopidy.tracklist.getRepeat(),
              mopidy.tracklist.getSingle()
            ).then(function(results) {
              return makeObject(['consume', 'random', 'repeat', 'single'], results);
            });
          },
          setOptions: function(params) {
            var promises = [];
            if ('consume' in params) {
              promises.push(mopidy.tracklist.setConsume({value: params.consume}));
            }
            if ('random' in params) {
              promises.push(mopidy.tracklist.setRandom({value: params.random}));
            }
            if ('repeat' in params) {
              promises.push(mopidy.tracklist.setRepeat({value: params.repeat}));
            }
            if ('single' in params) {
              promises.push(mopidy.tracklist.setSingle({value: params.single}));
            }
            return mopidy.all(promises);
          }
        });

        resolve(mopidy);
      });
      mopidy.connect();
    });

    var factory = function(callback) {
      if (callback) {
        var defer = $q.defer();
        promise.then(function(mopidy) {
          callback(mopidy).then(function(result) {
            $log.log('Mopidy deferred result', result);
            defer.resolve(result);
          });
        });
        return defer.promise;
      } else {
        return promise;
      }
    };

    return factory;
  };
})
;
