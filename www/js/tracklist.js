angular.module('mopidy-mobile.tracklist', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.popup'
])

.config(function($stateProvider) {
  $stateProvider.state('tabs.tracklist', {
    url: '/tracklist',
    views: {
      'tracklist': {
        templateUrl: 'templates/tracklist.html',
        controller: 'TracklistCtrl',
        resolve: {
          mopidy: function(connection) {
            return connection();
          },
          currentTlTrack: function(connection) {
            return connection(function(mopidy) {
              return mopidy.playback.getCurrentTlTrack();
            });
          },
          options: function(connection) {
            return connection(function(mopidy) {
              return mopidy.tracklist.getOptions();
            });
          },
          tlTracks: function(connection) {
            return connection(function(mopidy) {
              return mopidy.tracklist.getTlTracks();
            });
          },
          msg: function($q, $translate) {
            return $q.all({
              'Cancel': $translate('Cancel'),
              'Clear Tracklist': $translate('Clear Tracklist'),
              'Save as Playlist': $translate('Save as Playlist'),
              'OK': $translate('OK'),
              'Playlist Name': $translate('Playlist Name'),
              'Playlist saved': $translate('Playlist saved'),
              'Error saving playlist': $translate('Error saving playlist')
            });
          }
        }
      }
    }
  });
})

.controller('TracklistCtrl', function($scope, $log, $ionicPopover, $ionicPopup, mopidy, popup, msg, currentTlTrack, options, tlTracks) {
  var handlers = {
    'event:optionsChanged': function() {
      mopidy.tracklist.getOptions({
        /* no params */
      }).then(function(options) {
        $scope.$apply(function(scope) {
          scope.options = options;
        });
      }).catch($log.error);
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
      mopidy.playback.getCurrentTlTrack({
        /* no params */
      }).then(function(tlTrack) {
        $scope.$apply(function(scope) {
          scope.currentTlTrack = tlTrack;
        });
      }).catch($log.error);
      mopidy.tracklist.getTlTracks({
        /* no params */
      }).then(function(tlTracks) {
        $scope.$apply(function(scope) {
          scope.tlTracks = tlTracks;
        });
      }).catch($log.error);
    }
  };

  $ionicPopover.fromTemplateUrl('templates/popovers/tracklist.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  angular.extend($scope, {
    currentTlTrack: currentTlTrack,
    options: options,
    tlTracks: tlTracks,
    clear: function() {
      // TODO: i18n
      $ionicPopup.confirm({
        title: msg['Clear Tracklist'],
        okText: msg['OK'],
        cancelText: msg['Cancel']
      }).then(function(result) {
        if (result) {
          mopidy.tracklist.clear().catch(popup.error);
        }
      });
    },
    index: function(tlTrack) {
      var tlid = tlTrack.tlid;
      var tlTracks = $scope.tlTracks;
      for (var i = 0, length = tlTracks.length; i !== length; ++i) {
        if (tlTracks[i].tlid === tlid) {
          return i;
        }
      }
      return -1;
    },
    play: function(tlTrack) {
      mopidy.playback.play({
        tl_track: angular.copy(tlTrack)
      }).catch(popup.error);
    },
    remove: function(tlTrack) {
      mopidy.tracklist.remove({
        criteria: {tlid: [tlTrack.tlid]}
      }).catch(popup.error);
    },
    save: function() {
      // TODO: i18n
      $ionicPopup.prompt({
        title: msg['Save as Playlist'],
        template: msg['Playlist Name'],
        okText: msg['OK'],
        cancelText: msg['Cancel']
      }).then(function(name) {
        if (name) {
          mopidy.playlists.create({
            name: name
          }).then(function(playlist) {
            playlist.tracks = $scope.getTracks();
            return mopidy.playlists.save({playlist: playlist});
          }).then(
            function() {
              $ionicPopup.alert({
                title: msg['Playlist saved'],
                okText: msg['OK']
              });
            },
            function(error) {
              $ionicPopup.alert({
                title: msg['Error saving playlist'],
                subTitle: error.message,
                template: '<pre>' + error.data.message + '</pre>',
                okText: msg['OK']
              });
            }
          );
        }
      });
    },
    setOptions: function(params) {
      mopidy.tracklist.setOptions(params).catch(popup.error);
    },
    getThumbnailURI: function(track) {
      if (track.album && track.album.images && track.album.images.length) {
        return mopidy.resolveURI(track.album.images[0]);
      } else {
        return 'images/thumbnail.png';
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
    $scope.popover.remove();
  });
});
