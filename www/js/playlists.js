angular.module('mopidy-mobile.playlists', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.popup',
  'mopidy-mobile.settings'
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
        mopidy: function(connection) {
          return connection();
        },
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
        mopidy: function(connection) {
          return connection();
        },
        playlist: function($stateParams, connection) {
          return connection(function(mopidy) {
            return mopidy.playlists.lookup({uri: $stateParams.uri});
          });
        }
      }
    })
  ;
})

.controller('PlaylistsCtrl', function($scope, $log, mopidy, playlists, popup) {
  var handlers = {
    'event:playlistChanged': function(/*playlist*/) {
      // FIXME: simply reload all playlists for now...
      mopidy.playlists.getPlaylists().then(
        function(playlists) {
          $scope.$apply(function(scope) {
            scope.playlists = playlists;
          });
        },
        $log.error
      );
    },
    'event:playlistsLoaded': function() {
      mopidy.playlists.getPlaylists().then(
        function(playlists) {
          $scope.$apply(function(scope) {
            scope.playlists = playlists;
          });
        },
        $log.error
      );
    }
  };

  angular.extend($scope, {
    playlists: playlists,
    refresh: function() {
      mopidy.playlists.refresh({
        uri_scheme: null
      }).then(function() {
        $scope.$broadcast('scroll.refreshComplete');
      }).catch(popup.error);
    }
  });

  angular.forEach(handlers, function(listener, event) {
    mopidy.on(event, listener);
  });

  $scope.$on('$destroy', function() {
    angular.forEach(handlers, function(listener, event) {
      mopidy.off(event, listener);
    });
  });
})

.controller('PlaylistCtrl', function($scope, $ionicPopover, settings, popup, mopidy, playlist) {
  $ionicPopover.fromTemplateUrl('templates/popovers/playlist.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  angular.extend($scope, {
    playlist: playlist,
    add: function() {
      mopidy.tracklist.add({
        tracks: angular.copy(playlist.tracks)
      }).catch(popup.error);
    },
    click: function(track) {
      settings.click(mopidy, track.uri);
    },
    play: function() {
      mopidy.tracklist.add({
        tracks: angular.copy(playlist.tracks)
      }).then(function(tlTracks) {
        mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    },
    replace: function() {
      mopidy.tracklist.clear({
        /* no params */
      }).then(function() {
        return mopidy.tracklist.add({tracks: angular.copy(playlist.tracks)});
      }).then(function(tlTracks) {
        mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    }
  });
});
