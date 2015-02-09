angular.module('mopidy-mobile.playback', ['ionic', 'mopidy-mobile.settings'])

.config(function($stateProvider) {
  $stateProvider.state('tabs.playback', {
    url: '/playback',
    views: {
      'playback': {
        templateUrl: 'templates/playback.html',
        controller: 'PlaybackCtrl',
        resolve: {
          options: function(connection) {
            return connection(function(mopidy) {
              return mopidy.tracklist.getOptions();
            });
          },
          state: function(connection) {
            return connection(function(mopidy) {
              return mopidy.playback.getState();
            });
          },
          tlTracks: function(connection) {
            return connection(function(mopidy) {
              var currentTlTrack;
              return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
                currentTlTrack = tlTrack;
                return mopidy.tracklist.getPlaybackTlTracks({tl_track: tlTrack});
              }).then(function(tlTracks) {
                return angular.extend(tlTracks, {current: currentTlTrack});
              });
            });
          }
        }
      }
    }
  });
})

.controller('PlaybackCtrl', function($scope, $interval, $log, connection, options, state, tlTracks) {
  function setCurrentTlTrack(tlTrack) {
    if (!tlTrack || !$scope.tlTracks.current || tlTrack.tlid !== $scope.tlTracks.current.tlid) {
      connection(function(mopidy) {
        return mopidy.tracklist.getPlaybackTlTracks({tl_track: tlTrack});
      }).then(function(tlTracks) {
        $scope.tlTracks = angular.extend(tlTracks, {current: tlTrack});
        if (!tlTracks.current && tlTracks.eot) {
          $scope.track = tlTracks.eot.track;
        } else {
          $scope.track = tlTracks.current.track;
        }
      });
    }
  }

  var handlers = {
    'event:optionsChanged': function() {
      connection(function(mopidy) {
        return mopidy.tracklist.getOptions();
      }).then(function(options) {
        $scope.options = options;
      });
    },
    'event:playbackStateChanged': function(event) {
      $scope.state = event.new_state;
    },
    'event:trackPlaybackStarted': function(event) {
      setCurrentTlTrack(event.tl_track);
    },
    'event:tracklistChanged': function() {
      this.playback.getCurrentTlTrack().then(setCurrentTlTrack);
    }
  };

  angular.extend($scope, {
    options: options,
    state: state,
    tlTracks: tlTracks,
    track: (tlTracks.current || tlTracks.eot || {track: null}).track,
    play: function() {
      connection(function(mopidy) {
        return mopidy.playback.play();
      });
    },
    pause: function() {
      connection(function(mopidy) {
        return mopidy.playback.pause();
      });
    },
    stop: function() {
      connection(function(mopidy) {
        return mopidy.playback.stop();
      });
    },
    next: function() {
      // calling next() while stopped triggers no events
      var state = $scope.state;
      connection(function(mopidy) {
        return mopidy.playback.next().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      });
    },
    previous: function() {
      // calling previous() while stopped triggers no events
      var state = $scope.state;
      connection(function(mopidy) {
        mopidy.playback.previous().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      });
    },
    setOptions: function(params) {
      connection(function(mopidy) {
        mopidy.tracklist.setOptions(params);
      });
    },
    getImageURI: function(track) {
      if (track && track.album && track.album.images && track.album.images.length) {
        return connection.resolveURI(track.album.images[0]);
      } else {
        return '';
      }
    }
  });

  connection.on(handlers);

  $scope.$on('$destroy', function() {
    connection.off(handlers);
    $interval.cancel($scope.interval);
  });
})

.controller('SeekCtrl', function($scope, $interval, $log, $q, $window, connection) {
  var scope = angular.extend(this, {
    value: 0,
    pending: false,
    interval: null
  });
  var handlers = {
    'event:seeked': function(event) {
      if (!scope.pending) {
        scope.value = event.time_position;
      }
    },
    'event:trackPlaybackEnded':function() {
      $interval.cancel(scope.interval);
      scope.value = 0;
    },
    'event:trackPlaybackPaused': function(event) {
      $interval.cancel(scope.interval);
      scope.value = event.time_position;
    },
    'event:trackPlaybackResumed': function(event) {
      scope.value = event.time_position;
      scope.interval = $interval(update, 1000);
    },
    'event:trackPlaybackStarted': function() {
      scope.interval = $interval(update, 1000);
      scope.value = 0;
    }
  };
  connection.on(handlers);

  function update() {
    var t = $window.parseInt(scope.value);
    $log.log('update: ' + t);
    scope.value = t + 1000;  // FIXME: store (computed) start time?
  }

  scope.change = function() {
    if (scope.pending) {
      return;
    }
    var defer = $q.defer();
    function update(value) {
      connection(function(mopidy) {
        return mopidy.playback.seek({time_position: value});
      }).then(function() {
        if (value === $window.parseInt(scope.value)) {
          defer.resolve(value);
        } else {
          defer.notify(value);
        }
      });
    }
    scope.pending = true;
    update($window.parseInt(scope.value));
    defer.promise.then(
      function(value) {
        $log.debug('seek done: ' + value);
        scope.pending = false;
      }, function() {
        $log.debug('seek error');
        scope.pending = false;
      }, function(value) {
        $log.debug('seek pending: ' + value + ' (' + scope.value + ')');
        update($window.parseInt(scope.value));
      }
    );
  };

  $q.all({
    state: connection(function(mopidy) { return mopidy.playback.getState(); }),
    time: connection(function(mopidy) { return mopidy.playback.getTimePosition(); })
  }).then(function(result) {
    $log.debug('got state: ' + result.state + ', time position: ' + result.time);
    scope.value = result.time;
    if (result.state === 'playing') {
      scope.interval = $interval(update, 1000);
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(handlers);
  });
})

.controller('VolumeCtrl', function($scope, $log, $q, $window, connection) {
  var scope = angular.extend(this, {
    value: 0,
    pending: false,
    mute:false
  });
  var handlers = {
    'event:muteChanged': function(event) {
      scope.mute = event.mute;
    },
    'event:volumeChanged': function(event) {
      if (!scope.pending) {
        scope.value = event.volume;
      }
    }
  };
  connection.on(handlers);

  scope.setVolume = function(value) {
    var defer = $q.defer();
    function update(value) {
      connection(function(mopidy) {
        return mopidy.playback.setVolume({volume: value});
      }).then(function() {
        if (value === $window.parseInt(scope.value)) {
          defer.resolve(value);
        } else {
          defer.notify(value);
        }
      });
    }
    scope.pending = true;
    update($window.parseInt(value));
    defer.promise.then(
      function(value) {
        $log.debug('volume done: ' + value);
        scope.pending = false;
      }, function() {
        $log.debug('volume error');
        scope.pending = false;
      }, function(value) {
        $log.debug('volume pending: ' + value + ' (' + scope.value + ')');
        update($window.parseInt(scope.value));
      }
    );
  };

  scope.setMute = function(mute) {
    connection(function(mopidy) {
      mopidy.playback.setMute({value: mute});
    });
  };

  connection(function(mopidy) {
    return mopidy.playback.getVolume();
  }).then(function(value) {
    scope.value = value;
  });

  $scope.$on('$destroy', function() {
    connection.off(handlers);
  });
})
;
