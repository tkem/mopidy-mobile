angular.module('mopidy-mobile.playback',
[
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart'
])

.config(function($stateProvider) {
  $stateProvider.state('main.playback', {
    url: '/playback',
    views: {
      'playback': {
        templateUrl: 'templates/playback.html',
        controller: 'PlaybackCtrl'
      }
    }
  });
})

.factory('timer', function($interval) {
  return function(callback, delay) {
    var timer = {
      start: 0,
      value: 0,
      limit: null,
      interval: null
    };

    return {
      set: function(value) {
        timer.start = Date.now() - value;
        timer.value = value;
        callback(value);
      },
      start: function(value, limit) {
        if (value !== undefined) {
          timer.value = value;
        }
        if (limit !== undefined) {
          timer.limit = limit;
        }
        if (!timer.interval) {
          timer.interval = $interval(function() {
            var value = Date.now() - timer.start;
            if (timer.limit !== null && value > timer.limit) {
              value = timer.limit;
            }
            callback(value);
          }, delay);
        }
        timer.start = Date.now() - value;
        callback(timer.value);
      },
      stop: function(value) {
        if (value !== undefined) {
          timer.value = value;
        } else {
          timer.value = Date.now() - timer.start;
        }
        if (timer.interval) {
          $interval.cancel(timer.interval);
          timer.interval = null;
        }
        callback(timer.value);
      }
    };
  };
})

.controller('PlaybackCtrl', function($scope, $q, $window, $log, connection, coverart, timer) {
  $log.debug('creating tracklist view');

  function setCurrentTlTrack(currentTlTrack) {
    return connection(function(mopidy) {
      var params = {tl_track: currentTlTrack};
      return mopidy.constructor.when.join(
        mopidy.tracklist.eotTrack(params),
        mopidy.tracklist.nextTrack(params),
        mopidy.tracklist.previousTrack(params),
        mopidy.playback.getStreamTitle()
      );
    }).then(function(results) {
      var tlTracks = $scope.tlTracks = {
        current: currentTlTrack,
        eot: results[0],
        next: results[1],
        previous: results[2]
      };
      if (currentTlTrack) {
        $scope.track = currentTlTrack.track;
      } else if (tlTracks.eot) {
        $scope.track = tlTracks.eot.track;
      } else {
        $scope.track = null;
      }
      $scope.image = null;
      if ($scope.track) {
        coverart.getImage($scope.track).then(function(image) {
          $scope.image = image;
        });
      }
      $scope.stream = {title: results[3]};
      return $scope.track;
    });
  }

  var time = $scope.time = {
    position: 0,
    pending: false
  };

  var positionTimer = timer(function(value) {
    //$log.log('timer: ' + value, $scope.time.position, $scope.time.pending);
    if (!$scope.time.pending) {
      $scope.time.position = value;
    }
  }, 1000);

  var listeners = connection.on({
    'event:optionsChanged': function() {
      connection(function(mopidy) {
        return mopidy.tracklist.getOptions();
      }).then(function(options) {
        $scope.options = options;
      });
    },
    'event:playbackStateChanged': function(event) {
      if (($scope.state = event.new_state) === 'playing') {
        positionTimer.start();
      } else {
        positionTimer.stop();
      }
    },
    'event:seeked': function(event) {
      positionTimer.set(event.time_position);
    },
    'event:streamTitleChanged': function(event) {
      $scope.stream.title = event.title;
    },
    'event:tracklistChanged': function() {
      this.playback.getCurrentTlTrack().then(setCurrentTlTrack);
    },
    'event:trackPlaybackEnded':function() {
      positionTimer.stop(0);
    },
    'event:trackPlaybackPaused': function(event) {
      positionTimer.stop(event.time_position);
    },
    'event:trackPlaybackResumed': function(event) {
      positionTimer.start(event.time_position);
    },
    'event:trackPlaybackStarted': function(event) {
      setCurrentTlTrack(event.tl_track);
      positionTimer.start(0, event.tl_track.track.length || null);
    },
    'state:online': function() {
      $log.info('(re)connect: refreshing playback view');
      $scope.refresh();
    }
  });

  angular.extend($scope, {
    options: {},
    tlTracks: {},
    play: function() {
      connection(function(mopidy) {
        return mopidy.playback.play();
      }, true);
    },
    pause: function() {
      connection(function(mopidy) {
        return mopidy.playback.pause();
      }, true);
    },
    stop: function() {
      connection(function(mopidy) {
        return mopidy.playback.stop();
      }, true);
    },
    next: function() {
      // FIXME: calling next() while stopped triggers no events
      var state = $scope.state;
      connection(function(mopidy) {
        return mopidy.playback.next().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      }, true);
    },
    previous: function() {
      // FIXME: calling previous() while stopped triggers no events
      var state = $scope.state;
      connection(function(mopidy) {
        mopidy.playback.previous().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      }, true);
    },
    setRandom: function(value) {
      connection(function(mopidy) {
        mopidy.tracklist.setRandom({value: value});
      }, true);
    },
    setRepeat: function(value) {
      connection(function(mopidy) {
        mopidy.tracklist.setRepeat({value: value});
      }, true);
    },
    seek: function() {
      if (time.pending) {
        return;
      }
      var defer = $q.defer();
      function update(value) {
        connection(function(mopidy) {
          return mopidy.playback.seek({time_position: value});
        }).then(function() {
          if (value === $window.parseInt(time.position)) {
            defer.resolve(value);
          } else {
            defer.notify(value);
          }
        });
      }
      time.pending = true;
      update($window.parseInt(time.position));
      defer.promise.then(
        function(value) {
          $log.debug('seek done: ' + value);
          time.pending = false;
        }, function() {
          $log.debug('seek error');
          time.pending = false;
        }, function(value) {
          $log.debug('seek pending: ' + value + ' (' + time.position + ')');
          update($window.parseInt(time.position));
        }
      );
    },
    refresh: function() {
      connection(function(mopidy) {
        return mopidy.constructor.when.join(
          mopidy.playback.getCurrentTlTrack(),
          mopidy.playback.getTimePosition(),
          mopidy.playback.getState()
        );
      }).then(function(results) {
        if (($scope.state = results[2]) === 'playing') {
          positionTimer.start(results[1], results[0].track.length || null);
        } else {
          positionTimer.stop(results[1]);
        }
        return setCurrentTlTrack(results[0]);
      }).then(function() {
        // don't flood Mopidy with requests, so delay getOptions()
        return connection(function(mopidy) {
          return mopidy.tracklist.getOptions();
        });
      }).then(function(options) {
        $scope.options = options;
      });
    }
  });

  $scope.$on('$ionicView.enter', function() {
    $log.debug('entering playback view');
    // defensive action...
    $scope.refresh();
  });

  $scope.$on('$destroy', function() {
    $log.debug('destroying playback view');
    connection.off(listeners);
    positionTimer.stop();
  });
})

.controller('MixerCtrl', function($scope, $log, $q, $window, connection) {
  var scope = angular.extend(this, {
    volume: 0,
    pending: false,
    mute:false
  });

  var listeners = connection.on({
    'event:muteChanged': function(event) {
      scope.mute = event.mute;
    },
    'event:volumeChanged': function(event) {
      if (!scope.pending) {
        scope.volume = event.volume;
      }
    },
    'state:online': function() {
      $log.info('(re)connect: refreshing mixer controller');
      scope.refresh();
    }
  });

  angular.extend(scope, {
    changeVolume: function() {
      if (scope.pending) {
        return;
      }
      var defer = $q.defer();
      function update(value) {
        connection(function(mopidy) {
          return mopidy.mixer.setVolume({volume: value});
        }).then(function() {
          if (value === $window.parseInt(scope.volume)) {
            defer.resolve(value);
          } else {
            defer.notify(value);
          }
        });
      }
      scope.pending = true;
      update($window.parseInt(scope.volume));
      defer.promise.then(
        function(value) {
          $log.debug('volume done: ' + value);
          scope.pending = false;
        }, function() {
          $log.debug('volume error');
          scope.pending = false;
        }, function(value) {
          $log.debug('volume pending: ' + value + ' (' + scope.volume + ')');
          update($window.parseInt(scope.volume));
        }
      );
    },
    setMute: function(mute) {
      connection(function(mopidy) {
        mopidy.mixer.setMute({value: mute});
      }, true);
    },
    refresh: function() {
      return connection(function(mopidy) {
        return mopidy.constructor.when.join(
          mopidy.mixer.getMute(),
          mopidy.mixer.getVolume()
        );
      }).then(function(results) {
        $log.log('got mixer');
        scope.mute = results[0];
        scope.volume = results[1];
      });
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  scope.refresh();
});
