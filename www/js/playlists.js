angular.module('mopidy-mobile.playlists', [
  'ionic',
  'mopidy-mobile.actions',
  'mopidy-mobile.connection',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider
    .state('main.playlists', {
      url: '/playlists',
      views: {
        'playlists': {
          controller: 'PlaylistsCtrl',
          templateUrl: 'templates/playlists.html',
        }
      }
    })
    .state('main.playlist', {
      abstract: true,
      url: '/playlists/{uri}',
      views: {
        'playlists': {
          controller: 'PlaylistCtrl',
          template: '<ion-nav-view></ion-nav-view>',
          resolve: {
            playlist: function(connection, $stateParams) {
              if ($stateParams.uri) {
                return connection(function(mopidy) {
                  return mopidy.playlists.lookup({uri: $stateParams.uri});
                });
              } else {
                return {uri: null, name: null, tracks: []};
              }
            },
            editable: function(connection) {
              return connection(function(mopidy) {
                return mopidy.playlists.editable;
              });
            }
          }
        }
      }
    })
    .state('main.playlist.view', {
      url: '',
      templateUrl: 'templates/playlist.view.html'
    })
    .state('main.playlist.edit', {
      url: '/edit',
      templateUrl: 'templates/playlist.edit.html'
    })
  ;
})

.filter('playlistOrder', function($filter) {
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
})

.controller('PlaylistsCtrl', function(connection, $scope, $q, $log) {
  var listeners = {
    'connection:online': function() {
      $log.debug('playlists online', this);
      connection(function(mopidy) {
        return mopidy.playlists.asList();
      }).then(function(playlists) {
        $scope.playlists = playlists;
      });
    },
    'event:playlistChanged': function(/*playlist*/) {
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
    order: {},
    playlists: [],
    getScheme: function(uri) {
      return uri ? uri.substr(0, uri.indexOf(':')) : null;
    },
    refresh: function() {
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
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  connection.on(listeners);
})

.controller('PlaylistCtrl', function(actions, connection, editable, playlist, $ionicHistory, $scope) {
  function getScheme(uri) {
    return uri ? uri.substr(0, uri.indexOf(':')) : null;
  }

  var listeners = {
    // TODO: how to handle this, e.g. with editing
    // 'event:playlistChanged': function(playlist) {
    //   if ($scope.playlist.uri == playlist.uri) {
    //     $scope.playlist = playlist;
    //   }
    // }
  };

  angular.extend($scope, {
    editable: editable,
    playlist: playlist,
    click: actions.default,
    delete: function() {
      return connection(function(mopidy) {
        return mopidy.playlists.delete({
          uri: $scope.playlist.uri
        }).then(function() {
          // workaround for https://github.com/mopidy/mopidy/issues/996
          return mopidy.playlists.refresh({uri_scheme: getScheme($scope.playlist.uri)});
        });
      }).then(function() {
        $scope.playlist = {uri: null, name: null, tracks: []};
      });
    },
    goBack: function(backCount) {
      if (arguments.length) {
        return $ionicHistory.goBack();
      } else {
        return $ionicHistory.goBack(backCount);
      }
    },
    move: function(fromIndex, toIndex) {
      var tracks = $scope.playlist.tracks.splice(fromIndex, 1);
      $scope.playlist.tracks.splice(toIndex, 0, tracks[0]);
    },
    refresh: function() {
      connection(function(mopidy) {
        return mopidy.playlists.refresh({
          uri_scheme: getScheme($scope.playlist.uri)
        }).then(function() {
          if ($scope.playlist.uri) {
            return mopidy.playlists.lookup({uri: $scope.playlist.uri});
          } else {
            return {uri: null, name: null, tracks: []};
          }
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
    reset: function() {
      return connection(function(mopidy) {
        if ($scope.playlist.uri) {
          return mopidy.playlists.lookup({uri: $scope.playlist.uri});
        } else {
          return {uri: null, name: null, tracks: []};
        }
      }).then(function(playlist) {
        $scope.playlist = playlist;
      });
    },
    save: function() {
      return connection(function(mopidy) {
        if ($scope.playlist.uri) {
          return mopidy.playlists.save({playlist: angular.copy($scope.playlist)});
        } else {
          return mopidy.playlists.create({
            name: $scope.playlist.name
          }).then(function(playlist) {
            playlist.tracks = angular.copy($scope.playlist.tracks);
            return mopidy.playlists.save({playlist: playlist});
          });
        }
      }).then(function(playlist) {
        $scope.playlist = playlist;
      });
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  connection.on(listeners);
})

.controller('PlaylistsMenuCtrl', function(popoverMenu, $scope) {
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
})

.controller('PlaylistViewMenuCtrl', function(actions, popoverMenu, $scope) {
  angular.extend($scope, {
    actions: actions,
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
})

.controller('PlaylistEditMenuCtrl', function(popoverMenu, popup, $ionicHistory, $scope) {
  angular.extend($scope, {
    addURL: function() {
      popup.fromTemplateUrl('Add stream', 'templates/stream.html').then(function(result) {
        if (result.name && result.url) {
          var track = {
            __model__: 'Track',
            name: result.name,
            uri: result.url
          };
          if ($scope.playlist.tracks) {
            $scope.playlist.tracks.push(track);
          } else {
            $scope.playlist.tracks = [track];
          }
        }
      });
    },
    confirmDelete: function() {
      popup.confirm('Delete this playlist?').then(function(result) {
        if (result) {
          $scope.delete().then(function() {
            $ionicHistory.goBack(-2);
          });
        }
      });
    },
    popover: popoverMenu([{
      text: 'Add stream',
      click: 'popover.hide() && addURL()',
      hellip: true
    }, {
      text: 'Delete',
      click: 'popover.hide() && confirmDelete()',
      hellip: true
    }, {
      text: 'Cancel',
      click: 'popover.hide() && reset().then(goBack)'
    }], {
      scope: $scope
    })
  });
});
