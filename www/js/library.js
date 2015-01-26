// FIXME: settings?
var trackActions = {
  'add': function(mopidy, uri) {
    mopidy.tracklist.add({uri: uri});
  },
  'add+play': function(mopidy, uri) {
    mopidy.tracklist.add({uri: uri}).then(function(tlTracks) {
      mopidy.playback.play({tl_track: tlTracks[0]});
    });
  }
};

angular.module('app.library', ['ionic', 'app.services'])

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
          mopidy: function(Mopidy) {
            return Mopidy();
          },
          ref: function() {
            return null;
          },
          refs: function(Mopidy) {
            return Mopidy(function(mopidy) {
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
          mopidy: function(Mopidy) {
            return Mopidy();
          },
          ref: function($stateParams) {
            return {
              type: $stateParams.type,
              name: $stateParams.name,
              uri: $stateParams.uri,
            };
          },
          refs: function($stateParams, Mopidy) {
            return Mopidy(function(mopidy) {
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
          mopidy: function(Mopidy) {
            return Mopidy();
          },
          q: function($stateParams) {
            return $stateParams.q;
          },
          results: function($stateParams, Mopidy) {
            return Mopidy(function(mopidy) {
              return mopidy.library.search({
                query: {any: $stateParams.q},
                uris: $stateParams.uri ? [$stateParams.uri] : null
              });
            });
          }
        }
      })
    ;
  })

  .controller('BrowseCtrl', function($scope, $state, $log, Config, mopidy, ref, refs) {
    $scope.ref = ref;
    $scope.refs = refs;

    $scope.play = function(uri) {
      trackActions[Config.get('action', 'add+play')](mopidy, uri);
    };

    $scope.refresh = function() {
      mopidy.library.refresh({uri: $scope.ref ? $scope.ref.uri : null}).then(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.search = function(q) {
      $state.go('^.search', {q: q, uri: $scope.ref ? $scope.ref.uri : null});
    };
  })

  .controller('SearchCtrl', function($scope, Config, mopidy, q, results) {
    $scope.q = q;
    $scope.results = results;
    $scope.play = function(uri) {
      trackActions[Config.get('action', 'add+play')](mopidy, uri);
    };
  })
;
