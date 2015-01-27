angular.module('mopidy-mobile.playback', ['ionic', 'mopidy-mobile.settings'])

  .config(function($stateProvider) {
    $stateProvider.state('tabs.playback', {
      url: '/playback',
      views: {
        'playback': {
          templateUrl: 'templates/playback.html',
          controller: 'PlaybackCtrl',
          resolve: {
            mopidy: function(Mopidy) {
              return Mopidy();
            },
            mute: function(Mopidy) {
              return Mopidy(function(mopidy) {
                return mopidy.playback.getMute();
              });
            },
            options: function(Mopidy) {
              return Mopidy(function(mopidy) {
                return mopidy.tracklist.getOptions();
              });
            },
            state: function(Mopidy) {
              return Mopidy(function(mopidy) {
                return mopidy.playback.getState();
              });
            },
            tlTracks: function(Mopidy) {
              return Mopidy(function(mopidy) {
                return mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
                  // FIXME: better ways with when.js?
                  return mopidy.join(
                    mopidy.tracklist.tracks({tl_track: tlTrack}),
                    tlTrack
                  );
                }).then(function(results) {
                  return angular.extend(results[0], {current: results[1]});
                });
              });
            }
          }
        }
      }
    });
  })

  .controller('PlaybackCtrl', function($scope, $interval, $window, $log, $q, mopidy, mute, options, state, tlTracks) {
    function setCurrentTlTrack(tlTrack, timePosition) {
      $scope.$apply(function(scope) {
        if (!tlTrack || !scope.tlTracks.current || tlTrack.tlid !== scope.tlTracks.current.tlid) {
          scope.tlTracks = {current: tlTrack};
          scope.track = tlTrack ? tlTrack.track : null;
          mopidy.tracklist.tracks({tl_track: tlTrack}).then(function(tlTracks) {
            scope.$apply(function(scope) {
              if (!scope.track && tlTracks.eot) {
                scope.track = tlTracks.eot.track;
              }
              angular.extend(scope.tlTracks, tlTracks);
            });
          });
        }
        if (timePosition !== undefined) {
          scope.time.value = timePosition;
        }
      });
    }

    var handlers = {
      'event:muteChanged': function(event) {
        $scope.$apply(function(scope) {
          scope.mute = event.mute;
        });
      },
      'event:optionsChanged': function() {
        mopidy.tracklist.getOptions().then(function(options) {
          $scope.$apply(function(scope) {
            scope.options = options;
          });
        });
      },
      'event:playbackStateChanged': function(event) {
        $scope.$apply(function(scope) {
          scope.state = event.new_state;
        });
      },
      'event:trackPlaybackEnded': function() {
        mopidy.playback.getCurrentTlTrack().then(function(tlTrack) {
          setCurrentTlTrack(tlTrack, 0);
        });
      },
      'event:trackPlaybackPaused': function(event) {
        setCurrentTlTrack(event.tl_track, event.time_position);
      },
      'event:trackPlaybackResumed': function(event) {
        setCurrentTlTrack(event.tl_track, event.time_position);
      },
      'event:trackPlaybackStarted': function(event) {
        setCurrentTlTrack(event.tl_track, 0);
      },
      'event:tracklistChanged': function() {
        mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
      },
      // TODO: move to "slider" directive?
      'event:volumeChanged': function(event) {
        if (!$scope.volume.pending) {
          $scope.$apply(function(scope) {
            scope.volume.value = event.volume;
          });
        }
      },
      'event:seeked': function(event) {
        if (!$scope.time.pending) {
          $scope.$apply(function(scope) {
            scope.time.value = event.time_position;
          });
        }
      }
    };

    // TODO: slider directive?
    var time = $scope.time = {
      pending: false,
      value: 0
    };
    time.change = function() {
      if (time.pending) {
        return;
      }
      var defer = $q.defer();
      function update(value) {
        mopidy.playback.seek({
          time_position: value
        }).then(function() {
          if (value === $window.parseInt(time.value)) {
            defer.resolve();
          } else {
            defer.notify();
          }
        });
      }
      time.pending = true;
      update($window.parseInt(time.value));
      defer.promise.then(
        function() {
          $log.debug('seek done');
          time.pending = false;
        }, function() {
          $log.debug('seek error');
          time.pending = false;
        }, function() {
          $log.debug('seek pending: ' + time.value);
          update($window.parseInt(time.value));
        }
      );
    };
    mopidy.playback.getTimePosition().then(function(value) {
      $scope.$apply(function(scope) {
        scope.time.position = value;
      });
    });


    // TODO: slider directive?
    var volume = $scope.volume = {
      pending: false,
      value: 0
    };
    volume.change = function() {
      if (volume.pending) {
        return;
      }
      var defer = $q.defer();
      function update(value) {
        mopidy.playback.setVolume({
          volume: value
        }).then(function() {
          if (value === $window.parseInt(volume.value)) {
            defer.resolve();
          } else {
            defer.notify();
          }
        });
      }
      volume.pending = true;
      update($window.parseInt(volume.value));
      defer.promise.then(
        function() {
          $log.debug('volume done');
          volume.pending = false;
        }, function() {
          $log.debug('volume error');
          volume.pending = false;
        }, function() {
          $log.debug('volume pending: ' + volume.value);
          update($window.parseInt(volume.value));
        }
      );
    };
    mopidy.playback.getVolume().then(function(value) {
      $scope.$apply(function(scope) {
        scope.volume.value = value;
      });
    });

    //$scope.debug = true;
    $scope.mute = mute;
    $scope.options = options;
    $scope.state = state;
    $scope.tlTracks = tlTracks;
    $scope.track = (tlTracks.current || tlTracks.eot || {track: null}).track;

    $scope.interval = $interval(function() {
      if ($scope.state === 'playing') {
        var t = $window.parseInt($scope.time.value);
        // sync every 10 seconds
        if (Math.floor(t / 1000) % 10 === 0) {
          mopidy.playback.getTimePosition().then(function(value) {
            $scope.$apply(function(scope) {
              scope.time.value = value;
            });
          });
        } else {
          $scope.time.value = t + 1000;  // FIXME: store (computed) start time?
        }
      }
    }, 1000);

    $scope.play = function() {
      mopidy.playback.play();
    };

    $scope.pause = function() {
      mopidy.playback.pause();
    };

    $scope.stop = function() {
      mopidy.playback.stop();
    };

    $scope.next = function() {
      // calling next() while stopped triggers no events
      var state = $scope.state;
      mopidy.playback.next().then(function() {
        if (state === 'stopped') {
          mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
        }
      });
    };

    $scope.previous = function() {
      // calling previous() while stopped triggers no events
      var state = $scope.state;
      mopidy.playback.previous().then(function() {
        if (state === 'stopped') {
          mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
        }
      });
    };

    $scope.setMute = function(mute) {
      mopidy.playback.setMute({value: mute});
    };

    $scope.setOptions = function(params) {
      mopidy.tracklist.setOptions(params);
    };

    $scope.getImageURI = function(track) {
      if (track && track.album && track.album.images && track.album.images.length) {
        return mopidy.resolveURI(track.album.images[0]);
      } else {
        return '';
      }
    };

    $scope.$on('$destroy', function() {
      angular.forEach(handlers, function(listener, event) {
        mopidy.off(event, listener);
      });
      $interval.cancel($scope.interval);
    });

    angular.forEach(handlers, function(listener, event) {
      mopidy.on(event, listener);
    });
  })
;
