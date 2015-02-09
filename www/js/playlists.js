angular.module('mopidy-mobile.playlists', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.settings',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider
    .state('tabs.playlists', {
      abstract: true,
      url: '/playlists',
      views: {
        'playlists': {
          template: '<ion-nav-view></ion-nav-view>',
        }
      }
    })
    .state('tabs.playlists.root', {
      url: '',
      controller: 'PlaylistsCtrl',
      templateUrl: 'templates/playlists.html',
      resolve: {
        playlists: function(connection) {
          return connection(function(mopidy) {
            return mopidy.playlists.getPlaylists();
          });
        }
      }
    })
    .state('tabs.playlists.playlist', {
      url: '/{uri}',
      controller: 'PlaylistCtrl',
      templateUrl: 'templates/playlist.html',
      resolve: {
        playlist: function($stateParams, connection) {
          return connection(function(mopidy) {
            return mopidy.playlists.lookup({uri: $stateParams.uri});
          });
        }
      }
    })
  ;
})

.controller('PlaylistsCtrl', function($scope, $log, connection, playlists) {
  var handlers = {
    'event:playlistChanged': function(/*playlist*/) {
      connection(function(mopidy) {
        return mopidy.playlists.getPlaylists();
      }).then(function(playlists) {
        $scope.playlists = playlists;
      });
    },
    'event:playlistsLoaded': function() {
      connection(function(mopidy) {
        return mopidy.playlists.getPlaylists();
      }).then(function(playlists) {
        $scope.playlists = playlists;
      });
    }
  };

  angular.extend($scope, {
    playlists: playlists,
    refresh: function() {
      connection(function(mopidy) {
        return mopidy.playlists.refresh({uri_scheme: null});
      }).then(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    }
  });

  connection.on(handlers);

  $scope.$on('$destroy', function() {
    connection.off(handlers);
  });
})

.controller('PlaylistCtrl', function($scope, connection, settings, menu, playlist) {
  $scope.popover = menu([
    {
      text: 'Play All',
      click: 'popover.hide() && play()'
    },
    {
      text: 'Add to Tracklist',
      click: 'popover.hide() && add()'
    },
    {
      text: 'Replace Current Tracklist',
      click: 'popover.hide() && replace()'
    }
  ], {
    scope: $scope
  });

  angular.extend($scope, {
    playlist: playlist,
    add: function() {
      connection(function(mopidy) {
        return mopidy.tracklist.add({
          tracks: angular.copy(playlist.tracks)
        });
      });
    },
    click: function(track) {
      settings.click(track.uri);
    },
    play: function() {
      connection(function(mopidy) {
        return mopidy.tracklist.add({
          tracks: angular.copy(playlist.tracks)
        }).then(function(tlTracks) {
          return mopidy.playback.play({tl_track: tlTracks[0]});
        });
      });
    },
    replace: function() {
      connection(function(mopidy) {
        return mopidy.tracklist.clear().then(function() {
          return mopidy.tracklist.add({tracks: angular.copy(playlist.tracks)});
        }).then(function(tlTracks) {
          return mopidy.playback.play({tl_track: tlTracks[0]});
        });
      });
    }
  });
});
