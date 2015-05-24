angular.module('mopidy-mobile.library', [
  'ionic',
  'mopidy-mobile.actions',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider
    .state('main.library', {
      abstract: true,
      url: '/library',
      views: {
        'library': {
          template: '<ion-nav-view></ion-nav-view>',
        }
      }
    })
    .state('main.library.root', {
      url: '',
      templateUrl: 'templates/library.html',
      controller: 'LibraryCtrl'
    })
    .state('main.library.browse', {
      url: '/browse?name&type&uri',
      controller: 'BrowseCtrl',
      templateUrl: 'templates/browse.html',
      resolve: {
        ref: function($stateParams) {
          return {
            type: $stateParams.type,
            name: $stateParams.name,
            uri: $stateParams.uri,
          };
        },
        items: function($stateParams, connection) {
          return connection(function(mopidy) {
            return mopidy.library.browse({uri: $stateParams.uri});
          });
        }
      }
    })
    .state('main.library.search', {
      url: '/search?q&uri',
      controller: 'SearchCtrl',
      templateUrl: 'templates/search.html',
      resolve: {
        q: function($stateParams) {
          return $stateParams.q;
        },
        results: function($stateParams, connection) {
          return connection(function(mopidy) {
            return mopidy.library.search({
              query: {any: [$stateParams.q]},
              uris: $stateParams.uri ? [$stateParams.uri] : null
            });
          });
        }
      }
    })
    .state('main.library.lookup', {
      url: '/lookup?name&uri',
      controller: 'LookupCtrl',
      templateUrl: 'templates/lookup.html',
      resolve: {
        name: function($stateParams) {
          return $stateParams.name;
        },
        uri: function($stateParams) {
          return $stateParams.uri;
        },
        tracks: function($stateParams, connection) {
          return connection(function(mopidy) {
            return mopidy.library.lookup({uri: $stateParams.uri});
          });
        }
      }
    })
  ;
})

.controller('LibraryCtrl', function(connection, $scope, $state) {
  var listeners = {
    'connection:online': function() {
      connection(function(mopidy) {
        return mopidy.library.browse({uri: null});
      }).then(function(items) {
        $scope.items = items;
      });
    }
  };

  angular.extend($scope, {
    refresh: function() {
      connection().then(function(mopidy) {
        return mopidy.library.refresh({
          uri: null
        }).then(function() {
          return mopidy.library.browse({uri: null});
        });
      }).then(function(items) {
        $scope.items = items;
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    },
    search: function(q) {
      $state.go('^.search', {q: q});
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  connection.on(listeners);
})

.controller('BrowseCtrl', function(actions, connection, ref, items, $ionicHistory, $log, $scope, $state) {
  angular.extend($scope, {
    ref: ref,
    items: items,
    tracks: items.filter(function(ref) { return ref.type === 'track'; }),
    click: actions.default,
    refresh: function() {
      connection().then(function(mopidy) {
        return mopidy.library.refresh({
          uri: null
        }).then(function() {
          return mopidy.library.browse({uri: ref.uri});
        });
      }).then(function(items) {
        $scope.items = items;
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    },
    search: function(q) {
      $state.go('^.search', {q: q, uri: ref.uri});
    }
  });
})

.controller('SearchCtrl', function(actions, connection, coverart, q, results, $ionicHistory, $log, $scope) {
  function compare(a, b) {
    if ((a.name || '') > (b.name || '')) {
      return 1;
    } else if ((a.name || '') < (b.name || '')) {
      return -1;
    } else {
      return 0;
    }
  }

  switch (results.length) {
  case 0:
    $scope.artists = $scope.albums = $scope.tracks = [];
    break;
  case 1:
    // single result - keep order
    $scope.artists = results[0].artists || [];
    $scope.albums = results[0].albums || [];
    $scope.tracks = results[0].tracks || [];
    break;
  default:
    // multiple results - merge and sort by name
    $scope.artists = Array.prototype.concat.apply([], results.map(function(result) {
      return result.artists || [];
    })).sort(compare);
    $scope.albums = Array.prototype.concat.apply([], results.map(function(result) {
      return result.albums || [];
    })).sort(compare);
    $scope.tracks = Array.prototype.concat.apply([], results.map(function(result) {
      return result.tracks || [];
    })).sort(compare);
  }

  angular.extend($scope, {
    q: q,
    click: actions.default,
    images: {}
  });

  coverart.getImages([].concat($scope.artists, $scope.albums, $scope.tracks), {
    width: $scope.thumbnailWidth,
    height: $scope.thumbnailHeight
  }).then(function(result) {
    angular.extend($scope.images, result);
  });
})

.controller('LookupCtrl', function(actions, connection, coverart, name, tracks, uri, $ionicHistory, $log, $scope) {
  angular.extend($scope, {
    name: name,
    tracks: tracks,
    uri: uri,
    click: actions.default
  });

  coverart.getImages(tracks, {
    width: $scope.thumbnailWidth,
    height: $scope.thumbnailHeight
  }).then(function(images) {
    $scope.images = images;
  });
})

.controller('LibraryMenuCtrl', function(actions, popoverMenu, $scope) {
  angular.extend($scope, {
    actions: actions,
    popover: popoverMenu([{
      text: 'Play now',
      click: 'popover.hide() && actions.play(tracks)',
      disabled: '!tracks.length'
    }, {
      text: 'Play next',
      click: 'popover.hide() && actions.next(tracks)',
      disabled: '!tracks.length'
    }, {
      text: 'Add to tracklist',
      click: 'popover.hide() && actions.add(tracks)',
      disabled: '!tracks.length'
    }, {
      text: 'Replace tracklist',
      click: 'popover.hide() && actions.replace(tracks)',
      disabled: '!tracks.length'
    }], {
      scope: $scope
    })
  });
});
