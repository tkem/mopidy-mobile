angular.module('mopidy-mobile.library', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.settings'
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

.controller('BrowseCtrl', function($scope, $state, $ionicPopover, settings, mopidy, ref, refs) {
  $scope.ref = ref;
  $scope.refs = refs;
  $scope.tracks = refs.filter(function(ref) { return ref.type === 'track'; });

  $ionicPopover.fromTemplateUrl('templates/popovers/library.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.add = function() {
    mopidy.tracklist.add({
      uris: $scope.tracks.map(function(ref) { return ref.uri; })
    });
  };

  $scope.click = function(ref) {
    settings.click(mopidy, ref.uri);
  };

  $scope.play = function() {
    mopidy.tracklist.add({
      uris: $scope.tracks.map(function(ref) { return ref.uri; })
    }).then(function(tlTracks) {
      mopidy.playback.play({tl_track: tlTracks[0]});
    });
  };

  $scope.refresh = function() {
    mopidy.library.refresh({uri: $scope.ref ? $scope.ref.uri : null}).then(function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.replace = function() {
    mopidy.tracklist.clear({
    }).then(function() {
      return mopidy.tracklist.add({
        uris: $scope.tracks.map(function(ref) { return ref.uri; })
      });
    }).then(function(tlTracks) {
      mopidy.playback.play({tl_track: tlTracks[0]});
    });
  };

  $scope.search = function(q) {
    $state.go('^.search', {q: q, uri: $scope.ref ? $scope.ref.uri : null});
  };
})

.controller('SearchCtrl', function($scope, $ionicPopover, settings, mopidy, q, results) {
  function compare(a, b) {
    if ((a.name || '') > (b.name || '')) {
      return 1;
    } else if ((a.name || '') < (b.name || '')) {
      return -1;
    } else {
      return 0;
    }
  }

  $scope.q = q;

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

  $ionicPopover.fromTemplateUrl('templates/popovers/library.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $scope.add = function() {
    return mopidy.tracklist.add({tracks: angular.copy($scope.tracks)});
  };

  $scope.click = function(track) {
    return settings.click(mopidy, track.uri);
  };

  $scope.play = function() {
    return mopidy.tracklist.add({
      tracks: angular.copy($scope.tracks)
    }).then(function(tlTracks) {
      return mopidy.playback.play({tl_track: tlTracks[0]});
    });
  };

  $scope.replace = function() {
    return mopidy.tracklist.clear({
      // no params
    }).then(function() {
      return mopidy.tracklist.add({tracks: angular.copy($scope.tracks)});
    }).then(function(tlTracks) {
      return mopidy.playback.play({tl_track: tlTracks[0]});
    });
  };
})

.controller('LookupCtrl', function($scope, $ionicPopover, settings, mopidy, name, tracks, uri) {
  $scope.name = name;
  $scope.tracks = tracks;
  $scope.uri = uri;

  $ionicPopover.fromTemplateUrl('templates/popovers/library.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });


  $scope.add = function() {
    return mopidy.tracklist.add({tracks: angular.copy($scope.tracks)});
  };

  $scope.click = function(track) {
    return settings.click(mopidy, track.uri);
  };

  $scope.play = function() {
    return mopidy.tracklist.add({
      tracks: angular.copy($scope.tracks)
    }).then(function(tlTracks) {
      return mopidy.playback.play({tl_track: tlTracks[0]});
    });
  };

  $scope.replace = function() {
    return mopidy.tracklist.clear({
      // no params
    }).then(function() {
      return mopidy.tracklist.add({tracks: angular.copy($scope.tracks)});
    }).then(function(tlTracks) {
      return mopidy.playback.play({tl_track: tlTracks[0]});
    });
  };
});
