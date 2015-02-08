angular.module('mopidy-mobile.tracklist', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.ui'
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
          }
        }
      }
    }
  });
})

.controller('TracklistCtrl', function($scope, $log, mopidy, popup, menu, currentTlTrack, options, tlTracks) {
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

  $scope.popover = menu([
    {
      text: 'Clear',
      click: 'popover.hide() && clear()',
      disabled: '!tlTracks.length',
      hellip: true
    },
    {
      text: 'Save as',
      click: 'popover.hide() && save()',
      disabled: '!tlTracks.length',
      hellip: true
    },
    {
      text: 'Consume',
      model: 'options.consume',
      change: 'setOptions({consume: options.consume})'
    },
    {
      text: 'Random',
      model: 'options.random',
      change: 'setOptions({random: options.random})'
    },
    {
      text: 'Repeat',
      model: 'options.repeat',
      change: 'setOptions({repeat: options.repeat})'
    },
    {
      text: 'Single',
      model: 'options.single',
      change: 'setOptions({single: options.single})'
    },
  ], {
    scope: $scope
  });

  angular.extend($scope, {
    currentTlTrack: currentTlTrack,
    options: options,
    tlTracks: tlTracks,
    clear: function() {
      popup.confirm('Clear Tracklist').then(function(result) {
        if (result) {
          mopidy.tracklist.clear().catch(popup.error);
        }
      });
    },
    getTracks: function() {
      return $scope.tlTracks.map(function(tlTrack) { return tlTrack.track; });
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
      popup.prompt('Playlist Name').then(function(name) {
        if (name) {
          mopidy.playlists.create({
            name: name
          }).then(function(playlist) {
            playlist.tracks = $scope.getTracks();
            return mopidy.playlists.save({playlist: playlist});
          }).then(
            function() {
              popup.alert('Playlist saved');
            },
            function(error) {
              popup.error(error);
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
