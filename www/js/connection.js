angular.module('mopidy-mobile.connection', [])

.provider('connection', function() {
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

  provider.$get = function($q, $log, $window, $ionicLoading) {
    $log.info('Creating Mopidy instance', settings);
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
        // see https://github.com/mopidy/mopidy.js/issues/1
        var when = Mopidy.when || mopidy.getVersion().__proto__.constructor;
        // add convenience methods/decorators
        var library = angular.copy(mopidy.library);
        var tracklist = angular.copy(mopidy.tracklist);
        angular.extend(mopidy, {
          resolveURI: function(uri) {
            if (settings.webSocketUrl && isUriRefRegExp.test(uri)) {
              var match = /^ws:\/\/([^\/]+)/.exec(settings.webSocketUrl);
              return 'http://' + match[1] + uri;
            }
            return uri;
          }
        });
        angular.extend(mopidy.library, {
          lookup: function(params) {
            if ('uris' in params) {
              return when.all(params.uris.map(function(uri) {
                return library.lookup({uri: uri});
              })).then(function(results) {
                return Array.prototype.concat.apply([], results);
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
            return when.all([
              tracklist.getConsume(),
              tracklist.getRandom(),
              tracklist.getRepeat(),
              tracklist.getSingle()
            ]).then(function(results) {
              return makeObject(['consume', 'random', 'repeat', 'single'], results);
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
            return when.all(promises);
          },
          getPlaybackTlTracks: function(params) {
            return when.all([
              tracklist.eotTrack(params),
              tracklist.nextTrack(params),
              tracklist.previousTrack(params)
            ]).then(function(results) {
              return makeObject(['eot', 'next', 'previous'], results);
            });
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
        $log.log('Reconnecting to ' + webSocketUrl);
        $window.location.reload(true); // FIXME!!!
      }
    });
  };
})
;
