angular.module('mopidy-mobile.library', [
  'ionic',
  'mopidy-mobile.actions',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider.state('main.library', {
    abstract: true,
    url: '/library',
    views: {
      'library': {
        controller: 'LibraryCtrl',
        template: '<ion-nav-view></ion-nav-view>',
      }
    }
  }).state('main.library.root', {
    controller: 'RootDirectoryCtrl',
    templateUrl: 'templates/library.html',
    url: ''
  }).state('main.library.browse', {
    controller: 'BrowseCtrl',
    params: {
      name: 'Library',
      type: 'directory',
      uri: null
    },
    resolve: {
      items: function($ionicNavViewDelegate, $state, $stateParams, connection) {
        var href = $state.href('main.library.browse', $stateParams);
        if (!$ionicNavViewDelegate.isCached(href)) {
          return connection(function(mopidy) {
            return mopidy.library.browse({uri: $stateParams.uri});
          });
        }
      },
      ref: function($stateParams) {
        return {
          type: $stateParams.type,
          name: $stateParams.name,
          uri: $stateParams.uri,
        };
      }
    },
    templateUrl: 'templates/browse.html',
    url: '/{uri}/'
  }).state('main.library.lookup', {
    controller: 'LookupCtrl',
    params: {
      name: undefined,
      uri: undefined,
    },
    resolve: {
      name: function($stateParams) {
        return $stateParams.name;
      },
      tracks: function($ionicNavViewDelegate, $state, $stateParams, connection) {
        var href = $state.href('main.library.lookup', $stateParams);
        if (!$ionicNavViewDelegate.isCached(href)) {
          return connection(function(mopidy) {
            return mopidy.library.lookup({uri: $stateParams.uri});
          });
        }
      },
      uri: function($stateParams) {
        return $stateParams.uri;
      }
    },
    templateUrl: 'templates/lookup.html',
    url: '/{uri}'
  }).state('main.library.query', {
    controller: 'QueryCtrl',
    params: {
      name: 'Library',
      type: 'directory',
      uri: null
    },
    resolve: {
      ref: function($stateParams) {
        return $stateParams.uri ? {
          name: $stateParams.name,
          type: $stateParams.type,
          uri: $stateParams.uri,
        } : null;
      }
    },
    templateUrl: 'templates/query.html',
    url: '/{uri}?'
  }).state('main.library.search', {
    controller: 'SearchCtrl',
    params: {
      album: {array: true},
      albumartist: {array: true},
      any: {array: true},
      artist: {array: true},
      comment: {array: true},
      composer: {array: true},
      date: {array: true},
      exact: {squash: true, value: 'false'},
      genre: {array: true},
      performer: {array: true},
      track_name: {array: true},
      uris: {array: true}
    },
    resolve: {
      results: function($ionicNavViewDelegate, $state, $stateParams, connection) {
        var href = $state.href('main.library.search', $stateParams);
        if (!$ionicNavViewDelegate.isCached(href)) {
          return connection(function(mopidy) {
            var query = {};
            angular.forEach($stateParams, function(values, key) {
              if (angular.isArray(values) && key !== 'uris') {
                query[key] = values;
              }
            });
            return mopidy.library.search({
              query: query,
              uris: $stateParams.uris || null,
              exact: $stateParams.exact === 'true'
            });
          });
        }
      }
    },
    templateUrl: 'templates/search.html',
    url: '?album&albumartist&any&artist&comment&composer&date&genre&performer&track_name&uri&exact'
  });
})

.controller('LibraryCtrl', function(actions, coverart, popoverMenu, $scope, $state) {
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
    }], {
      scope: $scope
    }
  );
  angular.extend($scope, {
    actions: actions,
    getImages: function(models) {
      var images = {};
      coverart.getImages(models, {
        width: $scope.thumbnailWidth,
        height: $scope.thumbnailHeight
      }).then(function(result) {
        angular.extend(images, result);
      });
      return images;
    },
    popover: angular.extend({}, popover, {
      show: function(event, track) {
        event.preventDefault();
        event.stopPropagation();
        $scope.track = track;  // FIXME: more elegant way of passing track?
        popover.show(event);
      }
    }),
    search: function(params) {
      $state.go('^.search', params);
    }
  });
})

.controller('RootDirectoryCtrl', function(connection, $scope) {
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
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  connection.on(listeners);
})

.controller('BrowseCtrl', function(connection, items, ref, $scope) {
  angular.extend($scope, {
    items: items,
    ref: ref,
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
    tracks: items.filter(function(ref) { 
      return ref.type === 'track'; 
    })
  });
})

.controller('QueryCtrl', function(ref, $scope) {
  angular.extend($scope, {
    add: function(term) {
      $scope.terms.push(term);
    },
    params: {
      exact: false,
      uris: ref ? [ref.uri] : undefined
    },
    ref: ref,
    remove: function(index) {
      $scope.terms.splice(index, 1);
    },
    submit: function() {
      var params = {};
      $scope.terms.forEach(function(term) {
        if (term.value) {
          if (term.key in params) {
            params[term.key].push(term.value);
          } else {
            params[term.key] = [term.value];
          }
        }
      });
      $scope.search(angular.extend(params, $scope.params));
    },
    terms: [{key: 'any', value: ''}]
  });
})

.controller('SearchCtrl', function(results, $scope) {
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
    images: $scope.getImages([].concat($scope.artists, $scope.albums, $scope.tracks))
  });
})

.controller('LookupCtrl', function(name, tracks, uri, $scope) {
  angular.extend($scope, {
    images: $scope.getImages(tracks),
    name: name,
    tracks: tracks,
    uri: uri
  });
})

.controller('LibraryMenuCtrl', function(popoverMenu, $scope) {
  angular.extend($scope, {
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
