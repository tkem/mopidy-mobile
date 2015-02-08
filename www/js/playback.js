angular.module('mopidy-mobile.playback', ['ionic', 'mopidy-mobile.settings'])

.config(function($stateProvider) {
  $stateProvider.state('tabs.playback', {
    url: '/playback',
    views: {
      'playback': {
        templateUrl: 'templates/playback.html',
        controller: 'PlaybackCtrl',
        resolve: {
          mopidy: function(connection) {
            return connection();
          },
          mute: function(connection) {
            return connection(function(mopidy) {
              return mopidy.playback.getMute();
            });
          },
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

.controller('PlaybackCtrl', function($scope, $interval, $window, $log, $q, mopidy, popup, mute, options, state, tlTracks) {
  function setCurrentTlTrack(tlTrack, timePosition) {
    $scope.$apply(function(scope) {
      if (!tlTrack || !scope.tlTracks.current || tlTrack.tlid !== scope.tlTracks.current.tlid) {
        scope.tlTracks = {current: tlTrack};
        scope.track = tlTrack ? tlTrack.track : null;
        mopidy.tracklist.getPlaybackTlTracks({tl_track: tlTrack}).then(function(tlTracks) {
          scope.$apply(function(scope) {
            if (!scope.track && tlTracks.eot) {
              scope.track = tlTracks.eot.track;
            }
            angular.extend(scope.tlTracks, tlTracks);
          });
        });
      }
      //if (timePosition !== undefined) {
        //scope.time.value = timePosition;
      //}
    });
  }

  var handlers = {
    'event:muteChanged': function(event) {
      $scope.$apply(function(scope) {
        scope.mute = event.mute;
      });
    },
    'event:optionsChanged': function() {
      mopidy.tracklist.getOptions({
        /* no params */
      }).then(function(options) {
        $scope.$apply(function(scope) {
          scope.options = options;
        });
      }).catch($log.error);
    },
    'event:playbackStateChanged': function(event) {
      $scope.$apply(function(scope) {
        $log.log('new state: '+ event.new_state);
        scope.state = event.new_state;
      });
    },
    'event:trackPlaybackStarted': function(event) {
      setCurrentTlTrack(event.tl_track);
    },
    'event:tracklistChanged': function() {
      mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
    }
  };

  angular.extend($scope, {
    mute: mute,
    options: options,
    state: state,
    tlTracks: tlTracks,
    track: (tlTracks.current || tlTracks.eot || {track: null}).track,
    play: function() {
      mopidy.playback.play().catch(popup.error);
    },
    pause: function() {
      mopidy.playback.pause().catch(popup.error);
    },
    stop: function() {
      mopidy.playback.stop().catch(popup.error);
    },
    next: function() {
      // calling next() while stopped triggers no events
      var state = $scope.state;
      mopidy.playback.next().then(function() {
        if (state === 'stopped') {
          mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
        }
      });
    },
    previous: function() {
      // calling previous() while stopped triggers no events
      var state = $scope.state;
      mopidy.playback.previous().then(function() {
        if (state === 'stopped') {
          mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
        }
      });
    },
    setMute: function(mute) {
      mopidy.playback.setMute({value: mute}).catch(popup.error);
    },
    setOptions: function(params) {
      mopidy.tracklist.setOptions(params).catch(popup.error);
    },
    getImageURI: function(track) {
      if (track && track.album && track.album.images && track.album.images.length) {
        return mopidy.resolveURI(track.album.images[0]);
      } else {
        return '';
      }
    }
  });

  angular.forEach(handlers, function(listener, event) {
    mopidy.on(event, listener);
  });

  $scope.$on('$destroy', function() {
    angular.forEach(handlers, function(listener, event) {
      mopidy.off(event, listener);
    });
    $interval.cancel($scope.interval);
  });
})

.controller('SeekCtrl', function($scope, $interval, $log, $q, $window, connection) {
  var scope = angular.extend(this, {
    value: 0,
    pending: false,
    interval: null
  });

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

  // TODO: connection.on
  connection(function(mopidy) {
    mopidy.on('event:seeked', function(event) {
      $log.debug('seeked: ' + event.time_position + ', pending: ' + scope.pending);
      if (!scope.pending) {
        scope.value = event.time_position;
      }
    });
    mopidy.on('event:trackPlaybackEnded', function(event) {
      $log.debug('event:trackPlaybackEnded: ' + event.time_position);
      $scope.$apply(function() {
        $interval.cancel(scope.interval);
        scope.value = 0;
      });
    });
    mopidy.on('event:trackPlaybackPaused', function(event) {
      $log.debug('event:trackPlaybackPaused: ' + event.time_position);
      $scope.$apply(function() {
        $interval.cancel(scope.interval);
        scope.value = event.time_position;
      });
    });
    mopidy.on('event:trackPlaybackResumed', function(event) {
      $log.debug('event:trackPlaybackResumed: ' + event.time_position);
      $scope.$apply(function() {
        scope.value = event.time_position;
        scope.interval = $interval(update, 1000);
      });
    });
    mopidy.on('event:trackPlaybackStarted', function() {
      $log.debug('event:trackPlaybackStarted');
      scope.interval = $interval(update, 1000);
      $scope.$apply(function() {
        scope.value = 0;
      });
    });
  });

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

  // TODO: handle $destroy; $scope.$apply() necessary?!?
  $scope.$on('$destroy', function() {
    $log.debug('seek destroyed');
  });
})

.controller('VolumeCtrl', function($scope, $log, $q, $window, connection) {
  var scope = angular.extend(this, {
    value: 0,
    pending: false
  });

  scope.change = function() {
    if (scope.pending) {
      return;
    }
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
    update($window.parseInt(scope.value));
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

  connection(function(mopidy) {
    return mopidy.playback.getVolume();
  }).then(function(value) {
    $log.debug('got volume: ' + value);
    scope.value = value;
  });

  // TODO: connection.on
  connection(function(mopidy) {
    mopidy.on('event:volumeChanged', function(event) {
      $log.debug('volumeChanged: ' + event.volume + ', pending: ' + scope.pending);
      if (!scope.pending) {
        scope.value = event.volume;
      }
    });
  });

  // TODO: handle $destroy; $scope.$apply() necessary?!?
  $scope.$on('$destroy', function() {
    $log.debug('volume destroyed');
  });
})
;
