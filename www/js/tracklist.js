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
        controller: 'TracklistCtrl'
      }
    }
  });
})

.controller('TracklistCtrl', function($scope, $log, connection) {
  $log.debug('creating tracklist view');

  var listeners = connection.on({
    'event:optionsChanged': function() {
      connection(function(mopidy) {
        return mopidy.tracklist.getOptions();
      }).then(function(options) {
        $scope.options = options;
      });
    },
    'event:tracklistChanged': function() {
      connection(function(mopidy) {
        return mopidy.constructor.when.join(
          mopidy.tracklist.getTlTracks(),
          mopidy.playback.getCurrentTlTrack()
        );
      }).then(function(results) {
        $scope.tlTracks = results[0];
        $scope.currentTlTrack = results[1];
      });
    },
    'event:trackPlaybackEnded': function() {
      $scope.currentTlTrack = null;
    },
    'event:trackPlaybackStarted': function(event) {
      $scope.currentTlTrack = event.tl_track;
    },
    'state:online': function() {
      $log.info('(re)connect: refreshing tracklist view');
      $scope.refresh();
    }
  });

  angular.extend($scope, {
    options: {},
    tlTracks: [],
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
        return mopidy.playback.play({tl_track: angular.copy(tlTrack)});
      }, true);
    },
    remove: function(tlTrack) {
      connection(function(mopidy) {
        return mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
      }, true);
    },
    setOptions: function(params) {
      connection(function(mopidy) {
        return mopidy.tracklist.setOptions(params);
      }, true);
    },
    getThumbnailURI: function(track) {
      if (track.album && track.album.images && track.album.images.length) {
        return connection.resolveURI(track.album.images[0]);
      } else {
        return 'images/thumbnail.png';
      }
    },
    refresh: function() {
      connection(function(mopidy) {
        return mopidy.constructor.when.join(
          mopidy.tracklist.getTlTracks(),
          mopidy.tracklist.getOptions(),
          mopidy.playback.getCurrentTlTrack()
        );
      }).then(function(results) {
        $scope.tlTracks = results[0];
        $scope.options = results[1];
        $scope.currentTlTrack = results[2];
      });
    }
  });

  $scope.$on('$ionicView.enter', function() {
    $log.debug('entering tracklist view');
    // defensive action...
    $scope.refresh();
  });

  $scope.$on('$destroy', function() {
    $log.debug('destroying tracklist view');
    connection.off(listeners);
  });
})

.controller('TracklistMenuCtrl', function($scope, $rootScope, connection, popoverMenu, popup) {
  function createPopoverMenu() {
    return popoverMenu([{
      text: 'Clear',
      click: 'popover.hide() && clear()',
      disabled: '!tlTracks.length',
      hellip: true
    }, {
      text: 'Stream URL',
      click: 'popover.hide() && playURL()',
      hellip: true
    }, {
      text: 'Save as',
      click: 'popover.hide() && save()',
      disabled: '!tlTracks.length',
      hellip: true
    }], {
      scope: $scope
    });
  }

  angular.extend($scope, {
    popover: createPopoverMenu(),
    playURL: function() {
      popup.prompt('Stream URL', 'http://example.com/stream.mp3').then(function(url) {
        if (url) {
          connection(function(mopidy) {
            return mopidy.tracklist.add({uri: url}).then(function(tlTracks) {
              return mopidy.playback.play({tl_track: tlTracks[0]});
            });
          }, true);
        }
      });
    },
    clear: function() {
      popup.confirm('Clear Tracklist').then(function(result) {
        if (result) {
          connection(function(mopidy) {
            return mopidy.tracklist.clear();
          }, true);
        }
      });
    },
    save: function() {
      popup.prompt('Playlist Name', 'My Playlist').then(function(name) {
        if (name) {
          connection(function(mopidy) {
            return mopidy.playlists.create({name: name}).then(function(playlist) {
              playlist.tracks = $scope.getTracks();
              return mopidy.playlists.save({playlist: playlist});
            });
          }, true).then(function() {
            popup.alert('Playlist saved');
          });
        }
      });
    }
  });

  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  $rootScope.$on('$translateChangeSuccess', function() {
    var tmp = $scope.popover;
    $scope.popover = createPopoverMenu();
    tmp.remove();
  });
});
