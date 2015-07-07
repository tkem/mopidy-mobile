angular.module('mopidy-mobile.playlists', [
  'ionic',
  'mopidy-mobile.actions',
  'mopidy-mobile.connection',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider.state('main.playlists', {
    abstract: true,
    url: '/playlists',
    views: {
      'playlists': {
        controller: 'PlaylistsCtrl',
        template: '<ion-nav-view></ion-nav-view>'
      }
    }
  }).state('main.playlists.edit', {
    templateUrl: 'templates/playlists.edit.html',
    url: '/edit'
  }).state('main.playlists.view', {
    templateUrl: 'templates/playlists.view.html',
    url: ''
  }).state('main.playlist', {
    abstract: true,
    url: '/playlist/{uri}',
    views: {
      'playlists': {
        controller: 'PlaylistCtrl',
        template: '<ion-nav-view cache-view="false"></ion-nav-view>',
        resolve: {
          uri: function($stateParams) {
            return $stateParams.uri;
          },
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
              // TODO: smarter handling based on scheme?
              return mopidy.playlists.editable;
            });
          }
        }
      }
    }
  }).state('main.playlist.add', {
    templateUrl: 'templates/playlist.add.html',
    url: '/add'
  }).state('main.playlist.edit', {
    templateUrl: 'templates/playlist.edit.html',
    url: '/edit'
  }).state('main.playlist.view', {
    templateUrl: 'templates/playlist.view.html',
    url: ''
  });
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

.controller('PlaylistsCtrl', function(connection, popup, $q, $scope) {
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
})

.controller('PlaylistCtrl', function(actions, connection, editable, playlist, popoverMenu, popup, uri, $q, $scope) {

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
                popup.fromTemplateUrl('Track info', 'templates/info.html', $scope, [
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

.controller('PlaylistMenuCtrl', function(popoverMenu, $scope) {
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
})
;
