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
          }
        }
      }
    }
  });
})

.factory('timer', function($interval, $window) {
  var timer = {
    value: 0,
    limit: null,
    interval: null
  };

  return angular.extend(timer, {
    update: function() {
      //$log.log('update', timer.value, timer.limit);
      var t = $window.parseInt(timer.value) + 1000;
      if (timer.limit !== null) {
        timer.value = Math.min(t, timer.limit);
      } else {
        timer.value = t;
      }
    },
    start: function(value, limit) {
      //$log.log('start', value, limit);
      if (value !== undefined) {
        timer.value = value;
      }
      if (limit !== undefined) {
        timer.limit = limit;
      }
      if (!timer.interval) {
        timer.interval = $interval(timer.update, 1000);
      }
    },
    stop: function(value) {
      //$log.log('stop', value);
      if (value !== undefined) {
        timer.value = value;
      }
      if (timer.interval) {
        $interval.cancel(timer.interval);
        timer.interval = null;
      }
    }
  });
})

.controller('PlaybackCtrl', function($scope, $q, $window, $log, connection, options, timer) {
  function setCurrentTlTrack(tlTrack) {
    if (!tlTrack || !$scope.tlTracks.current || tlTrack.tlid !== $scope.tlTracks.current.tlid) {
      connection(function(mopidy) {
        return mopidy.tracklist.getPlaybackTlTracks({tl_track: tlTrack});
      }).then(function(tlTracks) {
        $scope.tlTracks = angular.extend(tlTracks, {current: tlTrack});
        if (tlTracks.current) {
          $scope.track = tlTracks.current.track;
        } else if (tlTracks.eot) {
          $scope.track = tlTracks.eot.track;
        } else {
          $scope.track = null;
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
      if (($scope.state = event.new_state) === 'playing') {
        $scope.time.start();
      } else {
        $scope.time.stop();
      }
    },
    'event:seeked': function(event) {
      if (!$scope.time.pending) {
        $scope.time.value = event.time_position;
      }
    },
    'event:tracklistChanged': function() {
      this.playback.getCurrentTlTrack().then(setCurrentTlTrack);
    },
    'event:trackPlaybackEnded':function() {
      $scope.time.stop(0);
    },
    'event:trackPlaybackPaused': function(event) {
      $scope.time.stop(event.time_position);
    },
    'event:trackPlaybackResumed': function(event) {
      $scope.time.start(event.time_position);
    },
    'event:trackPlaybackStarted': function(event) {
      setCurrentTlTrack(event.tl_track);
      $scope.time.start(0, event.tl_track.track.length || null);
    }
  };

  angular.extend($scope, {
    options: options,
    time: timer,
    tlTracks: {},
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

  $scope.seek = function() {
    var time = $scope.time;
    if (time.pending) {
      return;
    }
    var defer = $q.defer();
    function update(value) {
      connection(function(mopidy) {
        return mopidy.playback.seek({time_position: value});
      }).then(function() {
        if (value === $window.parseInt(time.value)) {
          defer.resolve(value);
        } else {
          defer.notify(value);
        }
      });
    }
    time.pending = true;
    update($window.parseInt(time.value));
    defer.promise.then(
      function(value) {
        $log.debug('seek done: ' + value);
        time.pending = false;
      }, function() {
        $log.debug('seek error');
        time.pending = false;
      }, function(value) {
        $log.debug('seek pending: ' + value + ' (' + time.value + ')');
        update($window.parseInt(time.value));
      }
    );
  };

  connection.on(handlers);

  $scope.$on('$ionicView.enter', function() {
    connection(function(mopidy) {
      return mopidy.constructor.when.join(
        mopidy.playback.getCurrentTlTrack(),
        mopidy.playback.getTimePosition(),
        mopidy.playback.getState()
      );
    }).then(function(results) {
      setCurrentTlTrack(results[0]);
      if (($scope.state = results[2]) === 'playing') {
        $scope.time.start(results[1], results[0].track.length || null);
      } else {
        $scope.time.stop(results[1]);
      }
    });
  });

  $scope.$on('$ionicView.leave', function() {
    $log.log('leave view');
  });

  $scope.$on('$destroy', function() {
    connection.off(handlers);
    $scope.time.stop();
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
