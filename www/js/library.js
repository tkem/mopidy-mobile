var LIBRARY_MENU = [
  {
    text: 'Play All Tracks',
    click: 'popover.hide() && play()',
    disabled: '!tracks.length'
  },
  {
    text: 'Add Tracks to Tracklist',
    click: 'popover.hide() && add()',
    disabled: '!tracks.length'
  },
  {
    text: 'Replace Current Tracklist',
    click: 'popover.hide() && replace()',
    disabled: '!tracks.length'
  }
];

angular.module('mopidy-mobile.library', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.settings',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider
    .state('tabs.library', {
      abstract: true,
      url: '/library',
      views: {
        'library': {
          template: '<ion-nav-view></ion-nav-view>',
        }
      }
    })
    .state('tabs.library.root', {
      url: '',
      templateUrl: 'templates/browse.html',
      controller: 'BrowseCtrl',
      resolve: {
        mopidy: function(connection) {
          return connection();
        },
        ref: function() {
          return null;
        },
        refs: function(connection) {
          return connection(function(mopidy) {
            return mopidy.library.browse({uri: null});
          });
        }
      }
    })
    .state('tabs.library.browse', {
      url: '/browse?type&name&uri',
      controller: 'BrowseCtrl',
      templateUrl: 'templates/browse.html',
      resolve: {
        mopidy: function(connection) {
          return connection();
        },
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
          });
        }
      }
    })
    .state('tabs.library.search', {
      url: '/search?q&uri',
      controller: 'SearchCtrl',
      templateUrl: 'templates/search.html',
      resolve: {
        mopidy: function(connection) {
          return connection();
        },
        q: function($stateParams) {
          return $stateParams.q;
        },
        results: function($stateParams, connection) {
          return connection(function(mopidy) {
            return mopidy.library.search({
              query: {any: $stateParams.q},
              uris: $stateParams.uri ? [$stateParams.uri] : null
            });
          });
        }
      }
    })
    .state('tabs.library.lookup', {
      url: '/lookup?name&uri',
      controller: 'LookupCtrl',
      templateUrl: 'templates/lookup.html',
      resolve: {
        mopidy: function(connection) {
          return connection();
        },
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

.controller('BrowseCtrl', function($scope, $state, settings, mopidy, popup, menu, ref, refs) {
  angular.extend($scope, {
    ref: ref,
    refs: refs,
    tracks: refs.filter(function(ref) { return ref.type === 'track'; }),
    popover: menu(LIBRARY_MENU, {scope: $scope}),
    add: function() {
      mopidy.tracklist.add({
        uris: $scope.tracks.map(function(ref) { return ref.uri; })
      }).catch(popup.error);
    },
    click: function(ref) {
      settings.click(mopidy, ref.uri);
    },
    play: function() {
      mopidy.tracklist.add({
        uris: $scope.tracks.map(function(ref) { return ref.uri; })
      }).then(function(tlTracks) {
        mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    },
    refresh: function() {
      mopidy.library.refresh({
        uri: $scope.ref ? $scope.ref.uri : null
      }).then(function() {
        $scope.$broadcast('scroll.refreshComplete');
      }).catch(popup.error);
    },
    replace: function() {
      mopidy.tracklist.clear({
        /* no params */
      }).then(function() {
        return mopidy.tracklist.add({
          uris: $scope.tracks.map(function(ref) { return ref.uri; })
        });
      }).then(function(tlTracks) {
        mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    },
    search: function(q) {
      $state.go('^.search', {q: q, uri: $scope.ref ? $scope.ref.uri : null});
    }
  });
})

.controller('SearchCtrl', function($scope, settings, mopidy, popup, menu, q, results) {
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
    popover: menu(LIBRARY_MENU, {scope: $scope}),
    add: function() {
      return mopidy.tracklist.add({
        tracks: angular.copy($scope.tracks)
      }).catch(popup.error);
    },
    click: function(track) {
      return settings.click(mopidy, track.uri);
    },
    play: function() {
      return mopidy.tracklist.add({
        tracks: angular.copy($scope.tracks)
      }).then(function(tlTracks) {
        return mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    },
    replace: function() {
      return mopidy.tracklist.clear({
        /* no params */
      }).then(function() {
        return mopidy.tracklist.add({tracks: angular.copy($scope.tracks)});
      }).then(function(tlTracks) {
        return mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    }
  });
})

.controller('LookupCtrl', function($scope, settings, mopidy, popup, menu, name, tracks, uri) {
  angular.extend($scope, {
    name: name,
    tracks: tracks,
    uri: uri,
    popover: menu(LIBRARY_MENU, {scope: $scope}),
    add: function() {
      return mopidy.tracklist.add({
        tracks: angular.copy($scope.tracks)
      }).catch(popup.error);
    },
    click: function(track) {
      return settings.click(mopidy, track.uri);
    },
    play: function() {
      return mopidy.tracklist.add({
        tracks: angular.copy($scope.tracks)
      }).then(function(tlTracks) {
        return mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    },
    replace: function() {
      return mopidy.tracklist.clear({
        /* no params */
      }).then(function() {
        return mopidy.tracklist.add({tracks: angular.copy($scope.tracks)});
      }).then(function(tlTracks) {
        return mopidy.playback.play({tl_track: tlTracks[0]});
      }).catch(popup.error);
    }
  });
});
