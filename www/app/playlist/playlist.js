;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'playlist': {
        abstract: true,
        parent: 'playlists',
        url: '/playlist/{uri}',
        params: {
          name: null,
          type: 'playlist',
          uri: null
        },

        controller: 'PlaylistController',
        resolve: {
          /* @ngInject */
          editable: function(connection) {
            return connection(function(mopidy) {
              // TODO: smarter handling based on scheme?
              return mopidy.playlists.editable;
            });
          },
          /* @ngInject */
          items: function(connection, uri) {
            return connection(function(mopidy) {
              return uri ? mopidy.playlists.getItems({uri: uri}) : [];
            });
          },
          /* @ngInject */
          ref: function(name, type, uri) {
            return {name: name, type: type, uri: uri};
          }
        },
        template: '<ion-nav-view></ion-nav-view>'
      },
      'playlist.add': {
        templateUrl: 'app/playlist/add.html',
        url: '/add'
      },
      'playlist.edit': {
        templateUrl: 'app/playlist/edit.html',
        url: '/edit'
      },
      'playlist.view': {
        templateUrl: 'app/playlist/view.html',
        url: ''
      }
    });
  });

  /* @ngInject */
  module.controller('PlaylistController', function(
    $log, $q, $scope, actions, connection, coverart, editable, items, paging, popoverMenu, popup, ref
  ) {
    $log.debug('New playlist controller: ' + ref.uri);
    // TODO: generic popover menu
    var popover = popoverMenu([{
      text: 'Play now',
      click: 'popover.hide() && actions.play(item)'
    }, {
      text: 'Play next',
      click: 'popover.hide() && actions.next(item)'
    }, {
      text: 'Add to tracklist',
      click: 'popover.hide() && actions.add(item)'
    }, {
      text: 'Show track info',
      hellip: true,
      click: 'popover.hide() && info(item)'
    }], {
      scope: $scope
    });

    $scope.actions = actions;
    $scope.editable = editable;
    $scope.images = {};
    $scope.items = angular.copy(items);
    $scope.ref = angular.copy(ref);

    $scope.add = function(item) {
      $scope.items.push(item);
      return $q.when($scope.items);
    };

    $scope.info = function(item) {
      return connection(function(mopidy) {
        return mopidy.library.lookup({uris: [item.uri]});
      }).then(function(result) {
        return result[item.uri];
      }).then(function(tracks) {
        // FIXME: more elegant way of passing track?
        if (tracks && tracks.length) {
          $scope.track = angular.extend({}, item, tracks[0]);
        } else {
          $scope.track = item;
        }
        popup.fromTemplateUrl('Track info', 'app/main/trackinfo.html', $scope, [
          {text: 'OK', type: 'button-positive'}
        ]);
      });
    };

    $scope.move = function(fromIndex, toIndex) {
      var items = $scope.items.splice(fromIndex, 1);
      $scope.items.splice(toIndex, 0, items[0]);
    };

    $scope.popover = angular.extend({}, popover, {
      show: function(event) {
        $scope.item = angular.element(event.target).scope().item;
        event.preventDefault();
        event.stopPropagation();
        popover.show(event);
      }
    });

    $scope.refresh = function() {
      connection().then(function(mopidy) {
        return mopidy.playlists.refresh({uri_scheme: $scope.getURIScheme($scope.ref.uri)});
      }).then(function() {
        return $scope.clearCache();
      }).then(function() {
        return $scope.reload();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.reload = function() {
      // "fake" reload
      $scope.$broadcast('$ionicView.leave');
      $scope.ref = angular.copy(ref);  // TODO: lookup?
      return connection().then(function(mopidy) {
        return $scope.ref.uri ? mopidy.playlists.getItems({uri: $scope.ref.uri}) : [];
      }).then(function(items) {
        $scope.items = items;
      }).then(function() {
        $scope.$broadcast('$ionicView.enter');
      });
    };

    $scope.remove = function(index) {
      $scope.items.splice(index, 1);
    };

    $scope.save = function() {
      return connection(function(mopidy) {
        return $scope.clearCache().then(function() {
          return $scope.ref.uri ?
            mopidy.playlists.lookup({uri: $scope.ref.uri}) :
            mopidy.playlists.create({name: $scope.ref.name});
        }).then(function(playlist) {
          return mopidy.playlists.save({playlist: angular.extend(playlist, {
            name: $scope.ref.name || playlist.name,
            tracks: $scope.items.map(function(item) {
              return { __model__: 'Track', name: item.name, uri: item.uri };
            })
          })});
        }).then(function(playlist) {
          $scope.ref = ref = {uri: playlist.uri, name: playlist.name, type: 'playlist'};
        });
      });
    };

    $scope.$on('$ionicView.enter', function() {
      var refs = $scope.items.filter(function(item) {
        return item.__model__ === 'Ref';
      });
      var promise = paging(function(items) {
        var uris = items.map(function(item) { return item.uri; });
        return connection().then(function(mopidy) {
          return mopidy.library.lookup({uris: uris});
        }).then(function(result) {
          return items.map(function(item) {
            var tracks = result[item.uri];
            if (tracks && tracks.length == 1) {
              return angular.extend(item, tracks[0]);
            } else {
              return item;
            }
          });
        }).then(function(items) {
          return coverart.getImages(items.filter(function(item) {
            return !(item.uri in $scope.images);
          }), $scope.thumbnail);
        }).then(function(images) {
          angular.extend($scope.images, images);
        });
      }, refs, 10);
      promise.finally($scope.$on('$ionicView.leave', function() {
        paging.cancel(promise);
      }));
    });
  });

  /* @ngInject */
  module.controller('PlaylistMenuController', function($scope, popoverMenu) {
    $scope.popover = popoverMenu([{
      text: 'Play now',
      click: 'popover.hide() && actions.play(items)'
    }, {
      text: 'Play next',
      click: 'popover.hide() && actions.next(items)'
    }, {
      text: 'Add to tracklist',
      click: 'popover.hide() && actions.add(items)'
    }, {
      text: 'Replace tracklist',
      click: 'popover.hide() && actions.replace(items)'
    }], {
      scope: $scope
    });
  });

})(angular.module('app.playlist', ['app.services', 'app.ui']));
