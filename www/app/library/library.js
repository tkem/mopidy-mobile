;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'library': {
        abstract: true,
        parent: 'tabs',
        url: '/library',
        views: {
          'library': {
            controller: 'LibraryController',
            template: '<ion-nav-view></ion-nav-view>',
          }
        }
      },
      'library.root': {
        controller: 'LibraryBrowseController',
        resolve: {
          /* @ngInject */
          items: function(connection) {
            return connection(function(mopidy) {
              return mopidy.library.browse({uri: null});
            });
          },
          /* @ngInject */
          ref: function() {
            return {
              name: null,
              type: 'directory',
              uri: null
            };
          }
        },
        templateUrl: 'app/library/browse.html',
        url: ''
      },
      'library.browse': {
        controller: 'LibraryBrowseController',
        params: {
          name: null,
          type: 'directory',
          uri: null
        },
        resolve: {
          /* @ngInject */
          items: function(connection, uri) {
            return connection(function(mopidy) {
              return mopidy.library.browse({uri: uri});
            });
          },
          /* @ngInject */
          ref: function(name, type, uri) {
            return {name: name, type: type, uri: uri};
          }
        },
        templateUrl: 'app/library/browse.html',
        url: '/{uri}/'
      },
      'library.lookup': {
        controller: 'LibraryLookupController',
        params: {
          name: null,
          type: 'directory',
          uri: null
        },
        resolve: {
          /* @ngInject */
          ref: function(name, type, uri) {
            return {name: name, type: type, uri: uri};
          },
          /* @ngInject */
          tracks: function(connection, uri) {
            return connection(function(mopidy) {
              return mopidy.library.lookup({uri: uri});
            });
          }
        },
        templateUrl: 'app/library/lookup.html',
        url: '/{uri}'
      },
      'library.query': {
        controller: 'LibraryQueryController',
        params: {
          name: null,
          type: 'directory',
          uri: null
        },
        resolve: {
          /* @ngInject */
          ref: function(name, type, uri) {
            return {name: name, type: type, uri: uri};
          }
        },
        templateUrl: 'app/library/query.html',
        url: '/{uri}?'
      },
      'library.search': {
        controller: 'LibrarySearchController',
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
          /* @ngInject */
          exact: function(exact) {
            return exact === 'true';
          },
          /* @ngInject */
          query: function(params) {
            var query = {};
            angular.forEach(params, function(values, key) {
              if (key !== 'uris' && key !== 'exact') {
                query[key] = values;
              }
            });
            return query;
          },
          /* @ngInject */
          results: function(connection, params) {
            return connection(function(mopidy) {
              var query = {};
              angular.forEach(params, function(values, key) {
                if (key !== 'uris' && key !== 'exact') {
                  query[key] = values;
                }
              });
              return mopidy.library.search({
                query: query,
                uris: params.uris || null,
                exact: params.exact === 'true'
              });
            });
          },
          /* @ngInject */
          uris: function(uris) {
            return uris || null;
          }
        },
        templateUrl: 'app/library/search.html',
        url: '?album&albumartist&any&artist&comment&composer&date&genre&performer&track_name&uris&exact'
      },
    });
  });

  /* @ngInject */
  module.controller('LibraryController', function(
      $log, $scope, connection, coverart, paging, popoverMenu, popup, router
  ) {
    // TODO: generic popover menu
    var popover = popoverMenu([{
      text: 'Play now',
      click: 'popover.hide() && actions.play(track)'
    }, {
      text: 'Play next',
      click: 'popover.hide() && actions.next(track)'
    }, {
      text: 'Add to tracklist',
      click: 'popover.hide() && actions.add(track)'
    }, {
      text: 'Add to playlist',
      hellip: true,
      click: 'popover.hide() && selectPlaylist(track)'
    }, {
      text: 'Show track info',
      hellip: true,
      click: 'popover.hide() && info(track)'
    }], {
      scope: $scope
    });

    $scope.cancel = function(promise) {
      return paging.cancel(promise);
    };

    $scope.getThumbnailImages = function(models) {
        return paging(function(models) {
            return coverart.getImages(models, $scope.thumbnail);
        }, models, 10);
    };

    $scope.info = function(track) {
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
    };

    $scope.lookup = function(refs) {
      return connection().then(function(mopidy) {
        var uris = refs.map(function(ref) { return ref.uri; });
        return mopidy.library.lookup({uris: uris});
      }).then(function(result) {
        var models = {};
        refs.forEach(function(ref) {
          var tracks = result[ref.uri];
          if (tracks && tracks.length) {
            // TODO: artist
            switch (ref.type) {
            case 'album':
              models[ref.uri] = tracks[0].album;
              break;
            case 'track':
              models[ref.uri] = tracks[0];
              break;
            }
          }
        });
        return models;
      });
    };

    $scope.popover = angular.extend({}, popover, {
      show: function(event, track) {
        event.preventDefault();
        event.stopPropagation();
        $scope.track = track;  // FIXME: more elegant way of passing track?
        popover.show(event);
      }
    });

    $scope.search = function(params) {
      router.go('^.search', params);
    };

    $scope.selectPlaylist = function(track) {
      return connection(function(mopidy) {
        return mopidy.playlists.asList();
      }).then(function(playlists) {
        // FIXME: pass arguments to popup...
        $scope.track = track;
        $scope.playlists = playlists;
        popup.fromTemplateUrl('Add to playlist', 'app/playlists/select.html', $scope, [
          {text: 'Cancel', type: 'button-assertive'}
        ]);
      });
    };
  });

  /* @ngInject */
  module.controller('LibraryBrowseController', function($log, $q, $scope, connection, items, ref) {
    function models(items) {
      var tracks = items.filter(function(ref) { return ref.type === 'track'; });
      // FIXME: convert to iterate/paging
      if (tracks.length && tracks.length < 1000) {
        $scope.lookup(tracks).then(function(result) {
          tracks.forEach(function(ref) {
            angular.extend(ref, result[ref.uri] || {});
          });
        });
      }
      return items;
    }

    $scope.items = models(items);
    $scope.ref = ref;
    $scope.images = {};
    $scope.tracks = $scope.items.filter(function(ref) { return ref.type === 'track'; });

    $scope.refresh = function() {
      connection().then(function(mopidy) {
        return mopidy.library.refresh({uri: ref.uri});
      }).then(function() {
        return $scope.clearCache();
      }).then(function() {
        return $scope.reload();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.reload = function() {
      // TODO: images
      return connection().then(function(mopidy) {
        return mopidy.library.browse({uri: ref.uri});
      }).then(function(items) {
        $scope.tracks = items.filter(function(ref) { return ref.type === 'track'; });
        $scope.items = models(items);
      });
    };

    $scope.$on('$ionicView.enter', function() {
      var promise = $scope.getThumbnailImages($scope.tracks.filter(function(ref) {
        return !(ref.uri in $scope.images);
      }));
      var resolve = $scope.$on('$ionicView.leave', function() {
        $scope.cancel(promise);
      });
      promise.then(angular.noop, angular.noop, function(images) {
          angular.extend($scope.images, images);
      }).then(resolve);
    });

    $scope.$on('connection:state:online', function() {
      $scope.reload();
    });
  });

  /* @ngInject */
  module.controller('LibraryLookupController', function($scope, connection, ref, tracks) {
    $scope.ref = ref;
    $scope.tracks = tracks;
    $scope.images = {};

    $scope.refresh = function() {
      connection().then(function(mopidy) {
        return mopidy.library.refresh({uri: ref.uri});
      }).then(function() {
        return $scope.clearCache();
      }).then(function() {
        return $scope.reload();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.reload = function() {
      // TODO: images
      return connection().then(function(mopidy) {
        return mopidy.library.lookup({uri: ref.uri});
      }).then(function(tracks) {
        $scope.tracks = tracks;
      });
    };

    $scope.$on('$ionicView.enter', function() {
      var promise = $scope.getThumbnailImages($scope.tracks.filter(function(track) {
        return !(track.uri in $scope.images);
      }));
      var resolve = $scope.$on('$ionicView.leave', function() {
        $scope.cancel(promise);
      });
      promise.then(angular.noop, angular.noop, function(images) {
          angular.extend($scope.images, images);
      }).then(resolve);
    });

    $scope.$on('connection:state:online', function() {
      $scope.reload();
    });
  });

  /* @ngInject */
  module.controller('LibraryQueryController', function($scope, ref) {
    $scope.ref = ref;
    $scope.params = {exact: false, uris: ref.uri ? [ref.uri] : null};
    $scope.terms = [{key: 'any', value: ''}];

    $scope.add = function(term) {
      $scope.terms.push(term);
    };

    $scope.submit = function() {
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
    };

    $scope.$watch('terms', function(terms) {
      if (terms[terms.length - 1].value) {
        terms.push({key: 'any', value: ''});
      }
    }, true);
  });

  /* @ngInject */
  module.controller('LibrarySearchController', function(connection, query, uris, exact, results, $log, $scope) {
    function compareModelsByName(a, b) {
      return (a.name || '').uri.localeCompare(b.name || '');
    }

    function mergeResults(results) {
      var obj = {};
      switch (results.length) {
      case 0:
        // no result
        obj.artists = obj.albums = obj.tracks = [];
        break;
      case 1:
        // single result - keep order
        obj.artists = results[0].artists || [];
        obj.albums = results[0].albums || [];
        obj.tracks = results[0].tracks || [];
        break;
      default:
        // multiple results - merge and sort by name
        obj.artists = Array.prototype.concat.apply([], results.map(function(result) {
          return result.artists || [];
        })).sort(compareModelsByName);
        obj.albums = Array.prototype.concat.apply([], results.map(function(result) {
          return result.albums || [];
        })).sort(compareModelsByName);
        obj.tracks = Array.prototype.concat.apply([], results.map(function(result) {
          return result.tracks || [];
        })).sort(compareModelsByName);
      }
      return obj;
    }

    angular.extend($scope, mergeResults(results));
    $scope.images = {};

    $scope.refresh = function() {
      connection().then(function(mopidy) {
        return mopidy.library.refresh({uri: uris && uris.length == 1 ? uris[0] : null});
      }).then(function() {
        return $scope.clearCache();
      }).then(function() {
        return $scope.reload();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.reload = function() {
      // TODO: images
      return connection().then(function(mopidy) {
        return mopidy.library.search({query: query, uris: uris, exact: exact});
      }).then(function(results) {
        angular.extend($scope, mergeResults(results));
      });
    };

    $scope.$on('$ionicView.enter', function() {
      var models = [].concat($scope.artists, $scope.albums, $scope.tracks).filter(function(model) {
        return !(model.uri in $scope.images);
      });
      var promise = $scope.getThumbnailImages(models);
      var resolve = $scope.$on('$ionicView.leave', function() {
        $scope.cancel(promise);
      });
      promise.then(angular.noop, angular.noop, function(images) {
          angular.extend($scope.images, images);
      }).then(resolve);
    });

    $scope.$on('connection:state:online', function() {
      $scope.reload();
    });
  });

  /* @ngInject */
  module.controller('LibraryMenuController', function($scope, popoverMenu) {
    $scope.popover = popoverMenu([{
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
    });
  });

})(angular.module('app.library', ['app.services', 'app.ui']));
