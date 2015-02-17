angular.module('mopidy-mobile.playlists', [
  'ionic',
  'mopidy-mobile.actions',
  'mopidy-mobile.connection',
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
          }, true);
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
          }, true);
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
      }, true).then(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    }
  });

  connection.on(handlers);

  $scope.$on('$destroy', function() {
    connection.off(handlers);
  });
})

.controller('PlaylistCtrl', function($scope, playlist, actions) {
  angular.extend($scope, {
    playlist: playlist,
    click: actions.default
  });
})

.controller('PlaylistMenuCtrl', function($scope, $rootScope, popoverMenu, actions) {
  function createPopoverMenu() {
    return popoverMenu([{
      text: 'Play Now',
      click: 'popover.hide() && actions.play(playlist.tracks)'
    }, {
      text: 'Play Next',
      click: 'popover.hide() && actions.next(playlist.tracks)'
    }, {
      text: 'Add to Tracklist',
      click: 'popover.hide() && actions.add(playlist.tracks)'
    }, {
      text: 'Replace Tracklist',
      click: 'popover.hide() && actions.replace(playlist.tracks)'
    }], {
      scope: $scope
    });
  }

  angular.extend($scope, {
    popover: createPopoverMenu(),
    actions: actions
  });

  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  $rootScope.$on('$translateChangeSuccess', function() {
    $scope.popover.remove();
    $scope.popover = createPopoverMenu();
  });
});
