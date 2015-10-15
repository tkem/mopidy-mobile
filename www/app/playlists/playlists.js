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
      'playlists.index': {
        params: {mode: 'view'},
        /* @ngInject */
        templateUrl: function($stateParams) {
          return 'app/playlists/index.' + $stateParams.mode + '.html';
        },
        url: ''
      },
      'playlists.lookup': {
        abstract: true,
        url: '/playlists/{uri}',
        controller: 'PlaylistController',
        template: '<ion-nav-view></ion-nav-view>',
        resolve: {
          /* @ngInject */
          playlist: function(connection, uri) {
            if (uri) {
              return connection(function(mopidy) {
                return mopidy.playlists.lookup({uri: uri});
              });
            } else {
              return {uri: null, name: null, tracks: []};
            }
          },
          /* @ngInject */
          editable: function(connection) {
            return connection(function(mopidy) {
              // TODO: smarter handling based on scheme?
              return mopidy.playlists.editable;
            });
          }
        }
      },
      'playlists.lookup.add': {
        templateUrl: 'app/playlists/lookup.add.html',
        url: '/'
      },
      'playlists.lookup.list': {
        params: {mode: 'view'},
        templateUrl: function($stateParams) {
          return 'app/playlists/lookup.' + $stateParams.mode + '.html';
        },
        url: ''
      }
    });
  });

  /* @ngInject */
  module.controller('PlaylistsController', function($scope, connection, playlists, popup) {
    angular.extend($scope, {'order': {}, 'playlists': playlists});

    $scope.refresh = function() {
      connection().then(function(mopidy) {
        return mopidy.playlists.refresh({uri_scheme: null});
      }).then(function() {
        return $scope.reload();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    // TODO: replace with $state.go($state.current, {}, {reload: true});
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

    $scope.getScheme = function(uri) {
      return uri ? uri.substr(0, uri.indexOf(':')) : null;
    };

    $scope.$on('connection:state:online', function() {
      $scope.reload();
    });

    $scope.$on('connection:event:playlistsLoaded', function() {
      $scope.reload();
    });

    $scope.$on('connection:event:playlistChanged', function() {
      $scope.reload();
    });

    $scope.$on('connection:event:playlistDeleted', function() {
      $scope.reload();
    });
  });

  /* @ngInject */
  module.controller('PlaylistController', function($q, $scope, actions, connection, editable, playlist, popoverMenu, popup) {
    // TODO: generic popover menu
    var popover = popoverMenu([{
      text: 'Play now',
      click: 'popover.hide() && actions.play(track)'
    }, {
      text: 'Play next',
      click: 'popover.hide() && actions.next(track)'
    }, {
      text: 'Add to tracklist',
      click: 'popover.hide() && actions.add(track)'
    }, {
      text: 'Show track info',
      hellip: true,
      click: 'popover.hide() && info(track)'
    }], {
      scope: $scope
    });

    angular.extend($scope, {actions: actions, editable: editable, playlist: playlist});

    $scope.add = function(track) {
      if ($scope.playlist.tracks) {
        $scope.playlist.tracks.push(track);
      } else {
        $scope.playlist.tracks = [track];
      }
      return $q.when($scope.playlist.tracks);
    };

    $scope.cancel = function() {
      return connection(function(mopidy) {
        if ($scope.playlist.uri) {
          return mopidy.playlists.lookup({uri: $scope.playlist.uri});
        } else {
          return {uri: null, name: null, tracks: []};
        }
      }).then(function(playlist) {
        $scope.playlist = playlist;
        return playlist;
      });
    };

    $scope.getScheme = function(uri) {
      return uri ? uri.substr(0, uri.indexOf(':')) : null;
    };

    $scope.info = function(track) {
      return connection(function(mopidy) {
        return mopidy.library.lookup({uri: track.uri}).then(function(tracks) {
          // FIXME: more elegant way of passing track?
          if (tracks && tracks.length) {
            $scope.track = angular.extend({}, track, tracks[0]);
          } else {
            $scope.track = track;
          }
          popup.fromTemplateUrl('Track info', 'app/main/trackinfo.html', $scope, [
            {text: 'OK', type: 'button-positive'}
          ]);
        });
      });
    };

    $scope.move = function(fromIndex, toIndex) {
      var tracks = $scope.playlist.tracks.splice(fromIndex, 1);
      $scope.playlist.tracks.splice(toIndex, 0, tracks[0]);
    };

    $scope.popover = angular.extend({}, popover, {
      show: function(event) {
        $scope.track = angular.element(event.target).scope().track;
        event.preventDefault();
        event.stopPropagation();
        popover.show(event);
      }
    });

    $scope.refresh = function() {
      connection().then(function(mopidy) {
        return mopidy.playlists.refresh({uri_scheme: $scope.getScheme($scope.playlist.uri)});
      }).then(function() {
        return $scope.reload();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    // TODO: replace with $state.go($state.current, {}, {reload: true});
    $scope.reload = function() {
      return connection().then(function(mopidy) {
        return mopidy.playlists.lookup({uri: $scope.playlist.uri});
      }).then(function(playlist) {
        $scope.playlist = playlist;
      });
    };

    $scope.remove = function(index) {
      $scope.playlist.tracks.splice(index, 1);
    };

    $scope.save = function() {
      return connection(function(mopidy) {
        if ($scope.playlist.uri) {
          return mopidy.playlists.save({playlist: angular.copy($scope.playlist)});
        } else {
          return mopidy.playlists.create({
            name: $scope.playlist.name
          }).then(function(playlist) {
            // TODO: error handling
            playlist.tracks = angular.copy($scope.playlist.tracks);
            return mopidy.playlists.save({playlist: playlist});
          });
        }
      }).then(function(playlist) {
        $scope.playlist = playlist;
        return playlist;
      });
    };
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
  module.controller('PlaylistMenuController', function($scope, popoverMenu) {
    $scope.popover = popoverMenu([{
      text: 'Play now',
      click: 'popover.hide() && actions.play(playlist.tracks)'
    }, {
      text: 'Play next',
      click: 'popover.hide() && actions.next(playlist.tracks)'
    }, {
      text: 'Add to tracklist',
      click: 'popover.hide() && actions.add(playlist.tracks)'
    }, {
      text: 'Replace tracklist',
      click: 'popover.hide() && actions.replace(playlist.tracks)'
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
