;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'playlists': {
        abstract: true,
        parent: 'tabs',
        url: '/playlists',
        views: {
          'playlists': {
            controller: 'PlaylistsController',
            resolve: {
              /* @ngInject */
              playlists: function(connection) {
                return connection(function(mopidy) {
                  return mopidy.playlists.asList();
                });
              },
            },
            template: '<ion-nav-view></ion-nav-view>'
          }
        }
      },
      'playlists.edit': {
        templateUrl: 'app/playlists/edit.html',
        url: '/edit'
      },
      'playlists.view': {
        templateUrl: 'app/playlists/view.html',
        url: ''
      },
    });
  });

  /* @ngInject */
  module.controller('PlaylistsController', function($scope, connection, playlists, popup) {
    angular.extend($scope, {'order': {}, 'playlists': playlists});

    $scope.refresh = function() {
      connection().then(function(mopidy) {
        return mopidy.playlists.refresh({uri_scheme: null});
      }).then(function() {
        return $scope.clearCache();
      }).then(function() {
        return $scope.reload();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.reload = function() {
      return connection().then(function(mopidy) {
        return mopidy.playlists.asList();
      }).then(function(playlists) {
        $scope.playlists = playlists;
      });
    };

    $scope.confirmDelete = function(ref) {
      popup.confirm('Delete playlist').then(function(result) {
        if (result) {
          return $scope.delete(ref.uri);
        }
      });
    };

    $scope.delete = function(uri) {
      return connection(function(mopidy) {
        return mopidy.playlists.delete({
          uri: uri
        }).then(function() {
          return mopidy.playlists.asList();
        }).then(function(playlists) {
          $scope.playlists = playlists;
        });
      });
    };

    $scope.$on('connection:state:online', function() {
      $scope.reload();
    });

    $scope.$on('connection:event:playlistsLoaded', function() {
      $scope.clearCache();
      $scope.reload();
    });

    $scope.$on('connection:event:playlistChanged', function() {
      $scope.clearCache();
      $scope.reload();
    });

    $scope.$on('connection:event:playlistDeleted', function() {
      $scope.clearCache();
      $scope.reload();
    });
  });

  /* @ngInject */
  module.controller('PlaylistsMenuController', function(popoverMenu, $scope) {
    $scope.popover = popoverMenu([{
      text: 'Sort by name',
      model: 'order.name',
    }, {
      text: 'Sort by scheme',
      model: 'order.scheme',
    }], {
      scope: $scope
    });
  });

  /* @ngInject */
  module.filter('playlistOrder', function($filter) {
    var orderBy = $filter('orderBy');
    return function(playlists, options) {
      if (options.name) {
        playlists = orderBy(playlists, 'name');
      }
      if (options.scheme) {
        playlists = orderBy(playlists, function(playlist) {
          return playlist.uri.substr(0, playlist.uri.indexOf(':'));
        });
      }
      return playlists;
    };
  });

})(angular.module('app.playlists', ['app.services', 'app.ui']));
