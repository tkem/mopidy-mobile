
angular.module('mopidy-mobile.library', [
  'ionic',
  'mopidy-mobile.actions',
  'mopidy-mobile.connection',
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
      templateUrl: 'templates/browse.html',
      controller: 'BrowseCtrl',
      resolve: {
        ref: function() {
          return null;
        },
        refs: function(connection) {
          return connection(function(mopidy) {
            return mopidy.library.browse({uri: null});
          }, true);
        }
      }
    })
    .state('main.library.browse', {
      url: '/browse?type&name&uri',
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
        refs: function($stateParams, connection) {
          return connection(function(mopidy) {
            return mopidy.library.browse({uri: $stateParams.uri});
          }, true);
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
              query: {any: $stateParams.q},
              uris: $stateParams.uri ? [$stateParams.uri] : null
            });
          }, true);
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
          }, true);
        }
      }
    })
  ;
})

.controller('BrowseCtrl', function($scope, $state, connection, actions, ref, refs) {
  angular.extend($scope, {
    ref: ref,
    refs: refs,
    tracks: refs.filter(function(ref) { return ref.type === 'track'; }),
    click: actions.default,
    refresh: function() {
      connection(function(mopidy) {
        return mopidy.library.refresh({uri: $scope.ref ? $scope.ref.uri : null});
      }, true).then(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    },
    search: function(q) {
      $state.go('^.search', {q: q, uri: $scope.ref ? $scope.ref.uri : null});
    }
  });
})

.controller('SearchCtrl', function($scope, connection, actions, q, results) {
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
    $scope.artists = results[0].artists;
    $scope.albums = results[0].albums;
    $scope.tracks = results[0].tracks;
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
    click: actions.default
  });
})

.controller('LookupCtrl', function($scope, connection, actions, name, tracks, uri) {
  angular.extend($scope, {
    name: name,
    tracks: tracks,
    uri: uri,
    click: actions.default
  });
})

.controller('LibraryMenuCtrl', function($scope, $rootScope, popoverMenu, actions) {
  function createPopoverMenu() {
    return popoverMenu([{
      text: 'Play Now',
      click: 'popover.hide() && actions.play(tracks)',
      disabled: '!tracks.length'
    }, {
      text: 'Play Next',
      click: 'popover.hide() && actions.next(tracks)',
      disabled: '!tracks.length'
    }, {
      text: 'Add to Tracklist',
      click: 'popover.hide() && actions.add(tracks)',
      disabled: '!tracks.length'
    }, {
      text: 'Replace Tracklist',
      click: 'popover.hide() && actions.replace(tracks)',
      disabled: '!tracks.length'
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
