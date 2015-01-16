// FIXME: app.settings?
var trackActions = {
  'add': function(mopidy, uri) {
    mopidy.tracklist.add({uri: uri});
  },
  'add+play': function(mopidy, uri) {
    mopidy.tracklist.add({uri: uri}).then(function(tlTracks) {
      mopidy.playback.play({tl_track: tlTracks[0]});
    });
  }
};

angular.module('app.playlists', ['ionic', 'app.services'])

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
          mopidy: function(Mopidy) {
            return Mopidy();
          },
          playlists: function(Mopidy) {
            return Mopidy(function(mopidy) {
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
          mopidy: function(Mopidy) {
            return Mopidy();
          },
          playlist: function($stateParams, Mopidy) {
            return Mopidy(function(mopidy) {
              return mopidy.playlists.lookup({uri: $stateParams.uri});
            });
          }
        }
      })
    ;
  })

  .controller('PlaylistsCtrl', function($scope, $log, mopidy, playlists) {
    var handlers = {
      'event:playlistChanged': function(playlist) {
        $log.log('playlistChanged: ' + playlist.name);
      },
      'event:playlistsLoaded': function() {
        mopidy.playlists.getPlaylists().then(function(playlists) {
          $scope.$apply(function(scope) {
            scope.playlists = playlists;
          });
        });
      }
    };

    $scope.playlists = playlists;

    $scope.refresh = function() {
      mopidy.playlists.refresh({uri_scheme: null}).then(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.$on('$destroy', function() {
      angular.forEach(handlers, function(listener, event) {
        mopidy.off(event, listener);
      });
    });

    angular.forEach(handlers, function(listener, event) {
      mopidy.on(event, listener);
    });

  })

  .controller('PlaylistCtrl', function($scope, $ionicPopover, Config, mopidy, playlist) {
    $ionicPopover.fromTemplateUrl('templates/playlist.popover.html', {
      scope: $scope,
    }).then(function(popover) {
      $scope.popover = popover;
    });

    $scope.playlist = playlist;

    $scope.add = function() {
      mopidy.tracklist.add({tracks: angular.copy(playlist.tracks)});
    };

    $scope.play = function(track) {
      if (track) {
        trackActions[Config.get('action', 'add+play')](mopidy, track.uri);
      } else {
        mopidy.tracklist.add({
          tracks: angular.copy(playlist.tracks)
        }).then(function(tlTracks) {
          mopidy.playback.play({tl_track: tlTracks[0]});
        });
      }
    };

    $scope.replace = function() {
      mopidy.tracklist.clear().then(function() {
        return mopidy.tracklist.add({tracks: angular.copy(playlist.tracks)});
      }).then(function(tlTracks) {
        mopidy.playback.play({tl_track: tlTracks[0]});
      });
    };
  })
;
