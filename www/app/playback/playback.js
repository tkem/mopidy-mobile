;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'playback': {
        parent: 'tabs',
        url: '/playback',
        views: {
          'playback': {
            templateUrl: 'app/playback/playback.html',
            controller: 'PlaybackCtrl'
          }
        }
      }
    });
  });

  // TODO: move to util, check out adamcik's media-progress-timer
  /* @ngInject */
  module.factory('timer', function($interval) {
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
  });

  /* @ngInject */
  module.controller('PlaybackCtrl', function($log, $q, $scope, $timeout, $window, connection, coverart, platform, timer) {
    function setCurrentTlTrack(currentTlTrack) {
      return connection(function(mopidy) {
        // TODO: only call eotTrack if needed
        return $q.all([
          mopidy.tracklist.eotTrack({tl_track: null}),
          mopidy.tracklist.getNextTlid(),
          mopidy.tracklist.getPreviousTlid(),
          mopidy.playback.getStreamTitle()
        ]);
      }).then(function(results) {
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
            platform.updatePlaybackControls($scope).catch(function(error) {
              $log.error('Error updating playback controls:', error);
            });
          });
        }
        platform.updatePlaybackControls($scope).catch(function(error) {
          $log.error('Error updating playback controls:', error);
        });
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

    angular.extend($scope, {options: {}, hasNext: false, hasPrevious: false});

    $scope.play = function() {
      return connection(function(mopidy) {
        return mopidy.playback.play();
      });
    };

    $scope.pause = function() {
      return connection(function(mopidy) {
        return mopidy.playback.pause();
      });
    };

    $scope.stop = function() {
      return connection(function(mopidy) {
        return mopidy.playback.stop();
      });
    };

    $scope.next = function() {
      // FIXME: calling next() while stopped triggers no events
      var state = $scope.state;
      return connection(function(mopidy) {
        return mopidy.playback.next().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      });
    };

    $scope.previous = function() {
      // FIXME: calling previous() while stopped triggers no events
      var state = $scope.state;
      return connection(function(mopidy) {
        mopidy.playback.previous().then(function() {
          if (state === 'stopped') {
            mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
          }
        });
      });
    };

    $scope.refresh = function() {
      $scope.reload().finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.reload = function() {
      return connection().then(function(mopidy) {
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
    };

    $scope.seek = function() {
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
        function() {
          time.pending = false;
        }, function() {
          time.pending = false;
        }, function() {
          update($window.parseInt(time.position));
        }
      );
    };

    $scope.togglePlay = function() {
      return connection(function(mopidy) {
        if ($scope.state !== 'playing') {
          return mopidy.playback.play();
        } else {
          return mopidy.playback.pause();
        }
      });
    };

    $scope.toggleRandom = function() {
      return connection(function(mopidy) {
        return mopidy.tracklist.setRandom({value: !$scope.options.random});
      });
    };

    $scope.toggleRepeat = function() {
      return connection(function(mopidy) {
        if ($scope.options.repeat && $scope.options.single) {
          // TODO: setOptions() API?
          return $q.all([
            mopidy.tracklist.setRepeat({value: false}),
            mopidy.tracklist.setSingle({value: false})
          ]);
        } else if ($scope.options.repeat) {
          return mopidy.tracklist.setSingle({value: true});
        } else {
          return mopidy.tracklist.setRepeat({value: true});
        }
      });
    };

    $scope.$on('connection:event:optionsChanged', function() {
      // TODO: data.options?
      connection(function(mopidy) {
        return mopidy.tracklist.getOptions();
      }).then(function(options) {
        $scope.options = options;
      });
    });

    $scope.$on('connection:event:playbackStateChanged', function(event, data) {
      if (($scope.state = data.new_state) === 'playing') {
        positionTimer.start();
      } else {
        positionTimer.stop();
      }
      platform.updatePlaybackState($scope.state);
    });

    $scope.$on('connection:event:seeked', function(event, data) {
      positionTimer.set(data.time_position);
    });

    $scope.$on('connection:event:streamTitleChanged', function(event, data) {
      $scope.streamTitle = data.title;
    });

    $scope.$on('connection:event:tracklistChanged', function() {
      // TODO: data.tracklist? data.current_track?
      connection(function(mopidy) {
        mopidy.playback.getCurrentTlTrack().then(setCurrentTlTrack);
      });
    });

    $scope.$on('connection:event:trackPlaybackEnded', function() {
      positionTimer.stop(0);
    });

    $scope.$on('connection:event:trackPlaybackPaused', function(event, data) {
      positionTimer.stop(data.time_position);
    });

    $scope.$on('connection:event:trackPlaybackResumed', function(event, data) {
      positionTimer.start(data.time_position);
    });

    $scope.$on('connection:event:trackPlaybackStarted', function(event, data) {
      setCurrentTlTrack(data.tl_track);
      positionTimer.start(0, data.tl_track.track.length || null);
    });

    $scope.$on('connection:state:online', function() {
      $scope.reload();
    });

    $scope.$on('$destroy', function() {
      positionTimer.stop();
    });

    $scope.reload().finally(function() {
      platform.splashscreen().then(function(splashscreen) {
        $timeout(splashscreen.hide, 250);  // give view some time to update
      });
    });
  });

  /* @ngInject */
  module.controller('MixerCtrl', function(connection, $scope, $log, $q, $window) {
    // FIXME: re-think "as" scopes...
    // TODO: "mixer" component?
    var scope = angular.extend(this, {
      volume: 0,
      pending: false,
      mute:false
    });

    $scope.$on('connection:state:online', function() {
      connection(function(mopidy) {
        return $q.all({
          mute: mopidy.mixer.getMute(),
          volume: mopidy.mixer.getVolume()
        });
      }).then(function(results) {
        angular.extend(scope, results);
      });
    });

    $scope.$on('connection:event:muteChanged', function(event, data) {
      scope.mute = data.mute;
    });

    $scope.$on('connection:event:volumeChanged', function(event, data) {
      if (!scope.pending) {
        scope.volume = data.volume;
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

    // TODO: refactor this
    connection(function(mopidy) {
      return $q.all({
        mute: mopidy.mixer.getMute(),
        volume: mopidy.mixer.getVolume()
      });
    }).then(function(results) {
      angular.extend(scope, results);
    });
  });

  /* @ngInject */
  module.controller('PlaybackMenuCtrl', function(connection, popoverMenu, popup, $scope) {
    angular.extend($scope, {
      info: function(track) {
        // FIXME: more elegant way of passing track?
        $scope.track = track;
        popup.fromTemplateUrl('Track info', 'app/main/trackinfo.html', $scope, [
          {text: 'OK', type: 'button-positive'}
        ]);
      },
      selectPlaylist: function(track) {
        return connection(function(mopidy) {
          return mopidy.playlists.asList();
        }).then(function(playlists) {
          // FIXME: pass arguments to popup...
          $scope.track = track;
          $scope.playlists = playlists;
          popup.fromTemplateUrl('Add to playlist', 'app/playlists/select.html', $scope, [
            {text: 'Cancel', type: 'button-assertive'}
          ]);
        });
      },
      popover: popoverMenu([{
        text: 'Add to playlist',
        hellip: true,
        click: 'popover.hide() && selectPlaylist(track)'
      }, {
        text: 'Show track info',
        hellip: true,
        click: 'popover.hide() && info(track)'
      }], {
        scope: $scope
      })
    });
  });

  /* @ngInject */
  module.run(function($document, $log, connection, actions) {
    $document.on('volumeupbutton', function() {
      actions.increaseVolume();
    });
    $document.on('volumedownbutton', function() {
      actions.decreaseVolume();
    });
  });

})(angular.module('app.playback', ['app.services', 'app.ui']));
