angular.module('app.tracklist', ['ionic', 'app.services'])

  .config(function($stateProvider) {
    $stateProvider.state('tabs.tracklist', {
      url: '/tracklist',
      views: {
        'tracklist': {
          templateUrl: 'templates/tracklist.html',
          controller: 'TracklistCtrl',
          resolve: {
            mopidy: function(Mopidy) {
              return Mopidy();
            },
            currentTlTrack: function(Mopidy) {
              return Mopidy(function(mopidy) {
                return mopidy.playback.getCurrentTlTrack();
              });
            },
            options: function(Mopidy) {
              return Mopidy(function(mopidy) {
                return mopidy.tracklist.getOptions();
              });
            },
            tlTracks: function(Mopidy) {
              return Mopidy(function(mopidy) {
                return mopidy.tracklist.getTlTracks();
              });
            }
          }
        }
      }
    });
  })

  .controller('TracklistCtrl', function($scope, $log, $ionicPopover, $ionicPopup, mopidy, currentTlTrack, options, tlTracks) {
    var handlers = {
      'event:optionsChanged': function() {
        mopidy.tracklist.getOptions().then(function(options) {
          $scope.$apply(function(scope) {
            scope.options = options;
          });
        });
      },
      'event:trackPlaybackEnded': function(event) {
        $scope.$apply(function(scope) {
          scope.currentTlTrack = event.tl_track;
        });
      },
      'event:trackPlaybackPaused': function(event) {
        $scope.$apply(function(scope) {
          scope.currentTlTrack = event.tl_track;
        });
      },
      'event:trackPlaybackResumed': function(event) {
        $scope.$apply(function(scope) {
          scope.currentTlTrack = event.tl_track;
        });
      },
      'event:trackPlaybackStarted': function(event) {
        $scope.$apply(function(scope) {
          scope.currentTlTrack = event.tl_track;
        });
      },
      'event:tracklistChanged': function() {
        mopidy.join(
          mopidy.playback.getCurrentTlTrack(),
          mopidy.tracklist.getTlTracks()
        ).then(function(results) {
          $scope.$apply(function(scope) {
            scope.currentTlTrack = results[0];
            scope.tlTracks = results[1];
          });
        });
      }
    };

    $ionicPopover.fromTemplateUrl('templates/tracklist.popover.html', {
      scope: $scope,
    }).then(function(popover) {
      $scope.popover = popover;
    });

    $scope.currentTlTrack = currentTlTrack;
    $scope.options = options;
    $scope.tlTracks = tlTracks;

    $scope.clear = function() {
      // TODO: i18n
      $ionicPopup.confirm({
        title: 'Clear Tracklist',
        okText: 'OK',
        cancelText: 'Cancel'
      }).then(function(result) {
        if (result) {
          mopidy.tracklist.clear();
        }
      });
    };

    $scope.getTracks = function() {
      var tracks = [];
      var tlTracks = $scope.tlTracks;
      for (var i = 0, length = tlTracks.length; i !== length; ++i) {
        tracks.push(tlTracks[i].track);
      }
      return tracks;
    };

    $scope.index = function(tlTrack) {
      var tlid = tlTrack.tlid;
      var tlTracks = $scope.tlTracks;
      for (var i = 0, length = tlTracks.length; i !== length; ++i) {
        if (tlTracks[i].tlid === tlid) {
          return i;
        }
      }
      return -1;
    };

    $scope.play = function(tlTrack) {
      mopidy.playback.play({tl_track: angular.copy(tlTrack)});
    };

    $scope.remove = function(tlTrack) {
      mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
    };

    $scope.save = function() {
      // TODO: i18n
      $ionicPopup.prompt({
        title: 'Playlist Name',
        okText: 'OK',
        cancelText: 'Cancel'
      }).then(function(name) {
        if (name) {
          mopidy.playlists.create({
            name: name
          }).then(function(playlist) {
            playlist.tracks = $scope.getTracks();
            return mopidy.playlists.save({playlist: playlist});
          }).then(
            function(playlist) {
              $ionicPopup.alert({
                title: 'Playlist ' + playlist.name + ' saved',
                okText: 'OK'
              });
            },
            function(error) {
              $ionicPopup.alert({
                title: 'Error saving playlist',
                subTitle: error.message,
                okText: 'OK'
              });
            }
          );
        }
      });
    };

    $scope.setOptions = function(params) {
      mopidy.tracklist.setOptions(params);
    };

    $scope.getImageURI = function(track) {
      if (track.album && track.album.images && track.album.images.length) {
        return mopidy.resolveURI(track.album.images[0]);
      } else {
        return '';
      }
    };

    $scope.$on('$destroy', function() {
      angular.forEach(handlers, function(listener, event) {
        mopidy.off(event, listener);
      });
      $scope.popover.remove();
    });

    angular.forEach(handlers, function(listener, event) {
      mopidy.on(event, listener);
    });
  })
;
