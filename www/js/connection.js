angular.module('mopidy-mobile.connection', [])

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

  provider.$get = function($q, $log, $window, $ionicLoading) {
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
    mopidy.on('reconnectionPending', function() {
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
        var when = mopidy.getVersion().__proto__.constructor;
        // convenience methods
        angular.extend(mopidy, {
          all: when.all,
          iterate: when.iterate,
	  join: function(/* promises */) {
	    return mopidy.all(arguments);
	  },
          resolveURI: function(uri) {
            if (settings.webSocketUrl && isUriRefRegExp.test(uri)) {
              var match = /^ws:\/\/([^\/]+)/.exec(settings.webSocketUrl);
              return 'http://' + match[1] + uri;
            }
            return uri;
          }
        });
        var tracklist = angular.copy(mopidy.tracklist);
        angular.extend(mopidy.tracklist, {
          add: function(params) {
            // tracklist.add() should *really* handle multiple URIs...
            var uris = params.uris;
            var at_position = params.at_position;
            var results = [];
            if (uris) {
              return mopidy.iterate(function(i) {
                return i + 1;
              }, function(i) {
                return i === uris.length;
              }, function(i) {
                $log.debug('add uri #' + i);
                return tracklist.add({
                  uri: uris[i],
                  at_position: at_position === undefined ? undefined : at_position + results.length
                }).then(function(tlTracks) {
                  Array.prototype.push.apply(results, tlTracks);
                });
              }, 0).then(function() {
                return results;
              });
            } else {
              return tracklist.add(params);
            }
          },
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
            defer.resolve(result);
          });
        });
        return defer.promise;
      } else {
        return promise;
      }
    };

    return angular.extend(factory, {
      reconnect: function(webSocketUrl) {
        $window.location.reload(true); // FIXME!!!
      }
    });
  };
})
;
