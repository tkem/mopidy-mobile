;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'playlist': {
        abstract: true,
        parent: 'tabs',
        url: '/playlist/{uri}',
        views: {
          'playlists': {
            controller: 'PlaylistController',
            template: '<ion-nav-view cache-view="false"></ion-nav-view>',
            resolve: {
              uri: function(uri) {
                return uri;
              },
              playlist: function(connection, uri) {
                if (uri) {
                  return connection(function(mopidy) {
                    return mopidy.playlists.lookup({uri: uri});
                  });
                } else {
                  return {uri: null, name: null, tracks: []};
                }
              },
              editable: function(connection) {
                return connection(function(mopidy) {
                  // TODO: smarter handling based on scheme?
                  return mopidy.playlists.editable;
                });
              }
            }
          }
        }
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
  module.controller('PlaylistController', function(actions, connection, editable, playlist, popoverMenu, popup, uri, $q, $scope) {

    var listeners = {
      // TODO: how to handle this, e.g. with editing
      // 'event:playlistChanged': function(playlist) {
      //   if ($scope.playlist.uri == playlist.uri) {
      //     $scope.playlist = playlist;
      //   }
      // }
    };
    var popover = popoverMenu(
      [{
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
      }
    );
    angular.extend($scope, {
      actions: actions,
      add: function(track) {
        if ($scope.playlist.tracks) {
          $scope.playlist.tracks.push(track);
        } else {
          $scope.playlist.tracks = [track];
        }
        return $q.when($scope.playlist.tracks);
      },
      cancel: function() {
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
      },
      editable: editable,
      getScheme: function(uri) {
        return uri ? uri.substr(0, uri.indexOf(':')) : null;
      },
      info: function(track) {
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
      },
      move: function(fromIndex, toIndex) {
        var tracks = $scope.playlist.tracks.splice(fromIndex, 1);
        $scope.playlist.tracks.splice(toIndex, 0, tracks[0]);
      },
      playlist: playlist,
      popover: angular.extend({}, popover, {
        show: function(event) {
          $scope.track = angular.element(event.target).scope().track;
          event.preventDefault();
          event.stopPropagation();
          popover.show(event);
        }
      }),
      refresh: function() {
        // FIXME: loading vs. refresh
        connection(function(mopidy) {
          return mopidy.playlists.refresh({
            uri_scheme: $scope.getScheme($scope.playlist.uri)
          }).then(function() {
            return mopidy.playlists.lookup({uri: $scope.playlist.uri});
          });
        }).then(function(playlist) {
          $scope.playlist = playlist;
        }).finally(function() {
          $scope.$broadcast('scroll.refreshComplete');
        });
      },
      remove: function(index) {
        $scope.playlist.tracks.splice(index, 1);
      },
      save: function() {
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
      }
    });

    $scope.$on('$destroy', function() {
      connection.off(listeners);
    });

    connection.on(listeners);
  });

  /* @ngInject */
  module.controller('PlaylistMenuController', function(popoverMenu, $scope) {
    angular.extend($scope, {
      popover: popoverMenu([{
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
      })
    });
  });

})(angular.module('app.playlist', ['app.services', 'app.ui']));
