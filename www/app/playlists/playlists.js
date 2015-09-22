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
      }
    });
  });

  /* @ngInject */
  module.controller('PlaylistsController', function(connection, popup, $q, $scope) {
    var listeners = {
      'connection:online': function() {
        connection(function(mopidy) {
          return mopidy.playlists.asList();
        }).then(function(playlists) {
          $scope.playlists = playlists;
        });
      },
      'event:playlistChanged': function(/*playlist*/) {
        // TODO: only update changed playlist
        $q.when(this.playlists.asList()).then(function(playlists) {
          $scope.playlists = playlists;
        });
      },
      'event:playlistsLoaded': function() {
        $q.when(this.playlists.asList()).then(function(playlists) {
          $scope.playlists = playlists;
        });
      }
    };

    angular.extend($scope, {
      confirmDelete: function(ref) {
        popup.confirm('Delete playlist').then(function(result) {
          if (result) {
            return $scope.delete(ref.uri);
          }
        });
      },
      delete: function(uri) {
        return connection(function(mopidy) {
          return mopidy.playlists.delete({
            uri: uri
          }).then(function() {
            return mopidy.playlists.asList();
          }).then(function(playlists) {
            $scope.playlists = playlists;
          });
        });
      },
      getScheme: function(uri) {
        return uri ? uri.substr(0, uri.indexOf(':')) : null;
      },
      refresh: function() {
        // FIXME: loading vs. refresh
        connection(function(mopidy) {
          return mopidy.playlists.refresh({
            uri_scheme: null
          }).then(function() {
            return mopidy.playlists.asList();
          });
        }).then(function(playlists) {
          $scope.playlists = playlists;
        }).finally(function() {
          $scope.$broadcast('scroll.refreshComplete');
        });
      },
      order: {},
      playlists: []
    });

    $scope.$on('$destroy', function() {
      connection.off(listeners);
    });

    connection.on(listeners);
  });

  /* @ngInject */
  module.controller('PlaylistsMenuController', function(popoverMenu, $scope) {
    angular.extend($scope, {
      popover: popoverMenu([{
        text: 'Sort by name',
        model: 'order.name',
      }, {
        text: 'Sort by scheme',
        model: 'order.scheme',
      }], {
        scope: $scope
      })
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
