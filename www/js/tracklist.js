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

.controller('TracklistCtrl', function($scope, $log, connection, popup, menu, currentTlTrack, options, tlTracks) {
  var handlers = {
    'event:optionsChanged': function() {
      connection(function(mopidy) {
        return mopidy.tracklist.getOptions();
      }).then(function(options) {
        $scope.options = options;
      });
    },
    'event:trackPlaybackEnded': function() {
      $scope.currentTlTrack = null;
    },
    'event:trackPlaybackStarted': function(event) {
      $scope.currentTlTrack = event.tl_track;
    },
    'event:tracklistChanged': function() {
      // TODO: all...
      connection(function(mopidy) {
        return mopidy.playback.getCurrentTlTrack();
      }).then(function(tlTrack) {
        $scope.currentTlTrack = tlTrack;
      });
      connection(function(mopidy) {
        return mopidy.tracklist.getTlTracks();
      }).then(function(tlTracks) {
        $scope.tlTracks = tlTracks;
      });
    }
  };
  connection.on(handlers);

  $scope.popover = menu([
    {
      text: 'Clear',
      click: 'popover.hide() && clear()',
      disabled: '!tlTracks.length',
      hellip: true
    },
    {
      text: 'Add URL',
      click: 'popover.hide() && addURL()',
      hellip: true
    },
    {
      text: 'Save as',
      click: 'popover.hide() && save()',
      disabled: '!tlTracks.length',
      hellip: true
    }
  ], {
    scope: $scope
  });

  angular.extend($scope, {
    currentTlTrack: currentTlTrack,
    options: options,
    tlTracks: tlTracks,
    addURL: function() {
      popup.prompt('Stream URL').then(function(url) {
        if (url) {
          connection(function(mopidy) {
            return mopidy.tracklist.add({uri: url}).then(function(tlTracks) {
              return mopidy.playback.play({tl_track: tlTracks[0]});
            });
          });
        }
      });
    },
    clear: function() {
      popup.confirm('Clear Tracklist').then(function(result) {
        if (result) {
          connection(function(mopidy) {
            return mopidy.tracklist.clear();
          });
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
      connection(function(mopidy) {
        return mopidy.playback.play({
          tl_track: angular.copy(tlTrack)
        });
      });
    },
    remove: function(tlTrack) {
      connection(function(mopidy) {
        return mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
      });
    },
    save: function() {
      popup.prompt('Playlist Name').then(function(name) {
        if (name) {
          connection(function(mopidy) {
            return mopidy.playlists.create({name: name}).then(function(playlist) {
              playlist.tracks = $scope.getTracks();
              return mopidy.playlists.save({playlist: playlist});
            });
          }).then(function() {
            popup.alert('Playlist saved');
          });
        }
      });
    },
    setOptions: function(params) {
      connection(function(mopidy) {
        return mopidy.tracklist.setOptions(params);
      });
    },
    getThumbnailURI: function(track) {
      if (track.album && track.album.images && track.album.images.length) {
        return connection.resolveURI(track.album.images[0]);
      } else {
        return 'images/thumbnail.png';
      }
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(handlers);
    $scope.popover.remove();
  });
});
