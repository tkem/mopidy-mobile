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
          resolve: {
            playlists: function(connection) {
              return connection(function(mopidy) {
                return mopidy.playlists.asList();
              }, true);
            }
          }
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
            playlist: function($stateParams, connection) {
              if ($stateParams.uri) {
                return connection(function(mopidy) {
                  return mopidy.playlists.lookup({uri: $stateParams.uri});
                }, true);
              } else {
                return {name: null, tracks: []};
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

.controller('PlaylistsCtrl', function($scope, $q, connection, playlists) {
  var listeners = {
    'event:playlistChanged': function(/*playlist*/) {
      // TODO: handle only changed playlist
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
    options: {},
    playlists: playlists,
    refresh: function() {
      connection(function(mopidy) {
        return mopidy.playlists.refresh({
          uri_scheme: null
        }).then(function() {
          return mopidy.playlists.asList();
        });
      }, true).then(function(playlists) {
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

.controller('PlaylistCtrl', function($scope, $log, $ionicHistory, connection, popup, playlist, editable, actions) {
  $log.log('Playlistctrl', playlist);
  var listeners = {
    'event:playlistChanged': function(changedPlaylist) {
      if (playlist.uri == changedPlaylist.uri) {
        // FIXME: handle while editing?
        $scope.playlist = angular.copy(playlist = changedPlaylist);
      }
    }
  };

  angular.extend($scope, {
    editable: editable,
    playlist: angular.copy(playlist),
    click: actions.default,
    addURL: function() {
      popup.fromTemplateUrl('Add Stream URL', 'templates/stream.html').then(function(result) {
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
    move: function(fromIndex, toIndex) {
      var tracks = $scope.playlist.tracks.splice(fromIndex, 1);
      $scope.playlist.tracks.splice(toIndex, 0, tracks[0]);
    },
    refresh: function() {
      connection(function(mopidy) {
        var uri = playlist.uri;
        return mopidy.playlists.refresh({
          uri_scheme: uri.substr(0, uri.indexOf(':'))
        }).then(function() {
          return mopidy.playlists.lookup({uri: uri});
        });
      }, true).then(function(newPlaylist) {
        $scope.playlist = angular.copy(playlist = newPlaylist);
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    },
    remove: function(index) {
      $scope.playlist.tracks.splice(index, 1);
    },
    rename: function() {
      popup.prompt('Playlist Name', $scope.playlist.name).then(function(name) {
        if (name) {
          $scope.playlist.name = name;
        }
      });
    },
    delete: function() {
      popup.confirm('Delete Playlist').then(function(result) {
        if (result) {
          connection(function(mopidy) {
            var uri = $scope.playlist.uri;
            return mopidy.playlists.delete({uri: uri}).then(function() {
              // workaround for https://github.com/mopidy/mopidy/issues/996
              var scheme= uri.substr(0, uri.indexOf(':'));
              mopidy.playlists.refresh({uri_scheme: scheme});
            });
          }, true).then(function() {
            $ionicHistory.goBack();
            $ionicHistory.goBack();
          });
        }
      });
    },
    cancel: function() {
      $scope.playlist = angular.copy(playlist);
      $ionicHistory.goBack();
    },
    save: function() {
      connection(function(mopidy) {
        return mopidy.playlists.save({playlist: angular.copy($scope.playlist)});
      }, true).then(function(savedPlaylist) {
        if (savedPlaylist) {
          $scope.playlist = angular.copy(playlist = savedPlaylist);
        } else {
          $log.error('playlists.save() returned null');
        }
        $ionicHistory.goBack();
      });
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  connection.on(listeners);
})

.controller('PlaylistsMenuCtrl', function($scope, $rootScope, popoverMenu) {
  function createPopoverMenu() {
    return popoverMenu([{
      text: 'Sort',
      model: 'options.sorted',
    }], {
      scope: $scope
    });
  }

  angular.extend($scope, {
    popover: createPopoverMenu()
  });

  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  $rootScope.$on('$translateChangeSuccess', function() {
    var popover = $scope.popover;
    $scope.popover = createPopoverMenu();
    popover.remove();
  });
})

.controller('PlaylistViewMenuCtrl', function($scope, $rootScope, popoverMenu, actions) {
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
    var popover = $scope.popover;
    $scope.popover = createPopoverMenu();
    popover.remove();
  });
})

.controller('PlaylistEditMenuCtrl', function($scope, $rootScope, popoverMenu) {
  function createPopoverMenu() {
    return popoverMenu([{
      text: 'Add Stream URL',
      click: 'popover.hide() && addURL()',
      hellip: true
    }, {
      text: 'Cancel',
      click: 'popover.hide() && cancel()',
      hellip: true
    }, {
      text: 'Rename',
      click: 'popover.hide() && rename()',
      hellip: true
    }, {
      text: 'Delete',
      click: 'popover.hide() && delete()',
      hellip: true
    }], {
      scope: $scope
    });
  }

  angular.extend($scope, {
    popover: createPopoverMenu()
  });

  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  $rootScope.$on('$translateChangeSuccess', function() {
    var popover = $scope.popover;
    $scope.popover = createPopoverMenu();
    popover.remove();
  });
});
