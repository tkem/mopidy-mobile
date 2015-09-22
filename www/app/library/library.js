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
        controller: 'LibraryRootController',
        templateUrl: 'app/library/library.html',
        url: ''
      },
      'library.browse': {
        controller: 'LibraryBrowseController',
        params: {
          name: 'Library',
          type: 'directory',
          uri: null
        },
        resolve: {
          items: function(connection, uri) {
            return connection(function(mopidy) {
              return mopidy.library.browse({uri: uri});
            });
          },
          ref: function(name, type, uri) {
            return {
              name: name,
              type: type,
              uri: uri
            };
          }
        },
        templateUrl: 'app/library/browse.html',
        url: '/{uri}/'
      },
      'library.lookup': {
        controller: 'LibraryLookupController',
        params: {
          name: undefined,
          uri: undefined,
        },
        resolve: {
          name: function(name) {
            return name;
          },
          tracks: function(connection, uri) {
            return connection(function(mopidy) {
              return mopidy.library.lookup({uri: uri});
            });
          },
          uri: function(uri) {
            return uri;
          }
        },
        templateUrl: 'app/library/lookup.html',
        url: '/{uri}'
      },
      'library.query': {
        controller: 'LibraryQueryController',
        params: {
          name: 'Library',
          type: 'directory',
          uri: null
        },
        resolve: {
          ref: function(name, type, uri) {
            return uri ? {
              name: name,
              type: type,
              uri: uri,
            } : null;
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
          results: function(connection, params) {
            return connection(function(mopidy) {
              var query = {};
              angular.forEach(params, function(values, key) {
                if (angular.isArray(values) && key !== 'uris') {
                  query[key] = values;
                }
              });
              return mopidy.library.search({
                query: query,
                uris: params.uris || null,
                exact: params.exact === 'true'
              });
            });
          }
        },
        templateUrl: 'app/library/search.html',
        url: '?album&albumartist&any&artist&comment&composer&date&genre&performer&track_name&uri&exact'
      },
    });
  });

  /* @ngInject */
  module.controller('LibraryController', function(actions, connection, coverart, popoverMenu, popup, $scope, router) {
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
        text: 'Add to playlist',
        hellip: true,
        click: 'popover.hide() && selectPlaylist(track)'
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
      info: function(track) {
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
        router.go('^.search', params);
      },
      selectPlaylist: function(track) {
        return connection(function(mopidy) {
          return mopidy.playlists.asList();
        }).then(function(playlists) {
          // FIXME: pass arguments to popup...
          $scope.track = track;
          $scope.playlists = playlists;
          popup.fromTemplateUrl('Add to playlist', 'templates/playlist.select.html', $scope, [
            {text: 'Cancel', type: 'button-assertive'}
          ]);
        });
      }
    });
  });

  /* @ngInject */
  module.controller('LibraryRootController', function(connection, $scope) {
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
  });

  /* @ngInject */
  module.controller('LibraryBrowseController', function(connection, items, ref, $scope) {
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
  });

  /* @ngInject */
  module.controller('LibraryQueryController', function(ref, $scope) {
    angular.extend($scope, {
      add: function(term) {
        $scope.terms.push(term);
      },
      params: {
        exact: false,
        uris: ref ? [ref.uri] : undefined
      },
      ref: ref,
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

    $scope.$watch('terms', function(terms) {
      if (terms[terms.length - 1].value) {
        terms.push({key: 'any', value: ''});
      }
    }, true);
  });

  /* @ngInject */
  module.controller('LibrarySearchController', function(results, $scope) {
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
  });

  /* @ngInject */
  module.controller('LibraryLookupController', function(name, tracks, uri, $scope) {
    angular.extend($scope, {
      images: $scope.getImages(tracks),
      name: name,
      tracks: tracks,
      uri: uri
    });
  });

  /* @ngInject */
  module.controller('LibraryMenuController', function(popoverMenu, $scope) {
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

})(angular.module('app.library', ['app.services', 'app.ui']));
