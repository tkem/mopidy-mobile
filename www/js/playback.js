angular.module('mopidy-mobile.playback', [
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

// TODO: move to util, check out adamcik's media-progress-timer
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

.controller('PlaybackCtrl', function(connection, coverart, timer, $log, $q, $scope, $window) {
  function setCurrentTlTrack(currentTlTrack) {
    return connection(function(mopidy) {
      // TODO: only call eotTrack if needed
      return mopidy.constructor.when.join(
        mopidy.tracklist.eotTrack({tl_track: null}),
        mopidy.tracklist.getNextTlid(),
        mopidy.tracklist.getPreviousTlid(),
        mopidy.playback.getStreamTitle()
      );
    }).then(function(results) {
      //$log.log('current: ' + (currentTlTrack ? currentTlTrack.tlid : null));
      //$log.log('eot: ' + (results[0] ? results[0].tlid : null));
      //$log.log('next: ' + results[1]);
      //$log.log('previous: ' + results[2]);
      if (currentTlTrack) {
        $scope.track = currentTlTrack.track;
      } else if (results[0]) {
        $scope.track = results[0].track;
      } else {
        $scope.track = null;
      }
      $scope.hasNext = results[1] !== null;
      $scope.hasPrevious = results[2] !== null;
      $scope.streamTitle = results[3];
      // reset image
      $scope.image = null;
      if ($scope.track) {
        coverart.getImage($scope.track).then(function(image) {
          $scope.image = image;
        });
      }
      return $scope.track;
    });
  }

  // TODO: use "normal" scope variables?
  var time = $scope.time = {
    position: 0,
    pending: false
  };

  var positionTimer = timer(function(value) {
    if (!$scope.time.pending) {
      $scope.time.position = value;
    }
  }, 1000);

  var listeners = {
    'connection:online': function() {
      connection(function(mopidy) {
        return $q.all({
          currentTlTrack: mopidy.playback.getCurrentTlTrack(),
          state: mopidy.playback.getState(),
          timePosition: mopidy.playback.getTimePosition(),
          options: mopidy.tracklist.getOptions()
        });
      }).then(function(results) {
        angular.extend($scope, results);
      }).then(function() {
        if ($scope.state === 'playing') {
          positionTimer.start($scope.timePosition, $scope.currentTlTrack.track.length || null);
        } else {
          positionTimer.stop($scope.timePosition);
        }
        setCurrentTlTrack($scope.currentTlTrack);
      });
    },
    'event:optionsChanged': function() {
      $q.when(this.tracklist.getOptions()).then(function(options) {
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
      $scope.streamTitle = event.title;
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
    }
  };

  angular.extend($scope, {
    options: {},
    hasNext: false,
    hasPrevious: false,
    play: function() {
      return connection(function(mopidy) {
        return mopidy.playback.play();
      });
    },
    pause: function() {
      return connection(function(mopidy) {
        return mopidy.playback.pause();
      });
    },
    stop: function() {
      return connection(function(mopidy) {
        return mopidy.playback.stop();
      });
    },
    next: function() {
      // FIXME: calling next() while stopped triggers no events
      var state = $scope.state;
      return connection(function(mopidy) {
        return mopidy.playback.next().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      });
    },
    previous: function() {
      // FIXME: calling previous() while stopped triggers no events
      var state = $scope.state;
      return connection(function(mopidy) {
        mopidy.playback.previous().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      });
    },
    refresh: function() {
      return connection().then(function(mopidy) {
        return $q.all({
          currentTlTrack: mopidy.playback.getCurrentTlTrack(),
          state: mopidy.playback.getState(),
          timePosition: mopidy.playback.getTimePosition()
        });
      }).then(function(results) {
        angular.extend($scope, results);
      }).then(function() {
        if ($scope.state === 'playing') {
          positionTimer.start($scope.timePosition, $scope.currentTlTrack.track.length || null);
        } else {
          positionTimer.stop($scope.timePosition);
        }
        setCurrentTlTrack($scope.currentTlTrack);
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
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
    togglePlay: function() {
      return connection(function(mopidy) {
        if ($scope.state !== 'playing') {
          return mopidy.playback.play();
        } else {
          return mopidy.playback.pause();
        }
      });
    },
    toggleRandom: function() {
      return connection(function(mopidy) {
        return mopidy.tracklist.setRandom({value: !$scope.options.random});
      });
    },
    toggleRepeat: function() {
      return connection(function(mopidy) {
        if ($scope.options.repeat && $scope.options.single) {
          // TODO: setOptions() API?
          return mopidy.constructor.when.join(
            mopidy.tracklist.setRepeat({value: false}),
            mopidy.tracklist.setSingle({value: false})
          );
        } else if ($scope.options.repeat) {
          return mopidy.tracklist.setSingle({value: true});
        } else {
          return mopidy.tracklist.setRepeat({value: true});
        }
      });
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
    positionTimer.stop();
  });

  connection.on(listeners);
})

.controller('MixerCtrl', function(connection, $scope, $log, $q, $window) {
  // FIXME: re-think "as" scopes...
  var scope = angular.extend(this, {
    volume: 0,
    pending: false,
    mute:false
  });

  var listeners = connection.on({
    'connection:online': function() {
      connection(function(mopidy) {
        return $q.all({
          mute: mopidy.mixer.getMute(),
          volume: mopidy.mixer.getVolume()
        });
      }).then(function(results) {
        angular.extend(scope, results);
      });
    },
    'event:muteChanged': function(event) {
      scope.mute = event.mute;
    },
    'event:volumeChanged': function(event) {
      if (!scope.pending) {
        scope.volume = event.volume;
      }
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
      return connection(function(mopidy) {
        mopidy.mixer.setMute({mute: mute});
      });
      // TODO: then(update mute) -- race condition with event?
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  connection.on(listeners);
})

    .controller('PlaybackMenuCtrl', function(popoverMenu, popup, $scope) {
  angular.extend($scope, {
    info: function(track) {
        // FIXME: more elegant way of passing track?
        $scope.track = track;
        popup.fromTemplateUrl('Track info', 'templates/info.html', $scope);
    },
    popover: popoverMenu([{
      text: 'Show track info',
      hellip: true,
      click: 'popover.hide() && info(track)'
    }], {
      scope: $scope
    })
  });
});
