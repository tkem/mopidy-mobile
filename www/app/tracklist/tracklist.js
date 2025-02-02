;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'tracklist': {
        abstract: true,
        parent: 'tabs',
        url: '/tracklist',
        views: {
          'tracklist': {
            template: '<ion-nav-view></ion-nav-view>',
            controller: 'TracklistController'
          }
        }
      },
      'tracklist.add': {
        url: '/add',
        templateUrl: 'app/tracklist/add.html',
      },
      'tracklist.edit': {
        url: '/edit',
        templateUrl: 'app/tracklist/edit.html',
      },
      'tracklist.view': {
        url: '',
        templateUrl: 'app/tracklist/view.html',
      }
    });
  });

  /* @ngInject */
  module.controller('TracklistController', function(
      $log, $q, $scope, connection, coverart, paging, popoverMenu, popup
  ) {
    // TODO: generic popover menu
    var popover = popoverMenu(
      [{
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

    $scope.images = {};
    $scope.options = {};
    $scope.tlTracks = [];

    $scope.add = function(uri) {
      return connection(function(mopidy) {
        return mopidy.tracklist.add({uris: [uri]});
      });
    };

    $scope.clear = function() {
      return connection(function(mopidy) {
        return mopidy.tracklist.clear();
      });
    };

    $scope.confirmClear = function() {
      popup.confirm('Clear tracklist').then(function(result) {
        if (result) {
          $scope.clear();
        }
      });
    };

    $scope.getTracks = function() {
      return $scope.tlTracks.map(function(tlTrack) { return tlTrack.track; });
    };

    $scope.index = function(tlTrack) {
      // TODO: index() returns index of current track in Mopidy v1.1
      var tlid = tlTrack.tlid;
      var tlTracks = $scope.tlTracks;
      for (var i = 0, length = tlTracks.length; i !== length; ++i) {
        if (tlTracks[i].tlid === tlid) {
          return i;
        }
      }
      return -1;
    };

    $scope.info = function(track) {
      // FIXME: more elegant way of passing track?
      $scope.track = track;
      popup.fromTemplateUrl('Track info', 'app/main/trackinfo.html', $scope, [
        {text: 'OK', type: 'button-positive'}
      ]);
    };

    $scope.move = function(fromIndex, toIndex) {
      // update local copy first for user feedback
      var tlTracks = $scope.tlTracks.splice(fromIndex, 1);
      $scope.tlTracks.splice(toIndex, 0, tlTracks[0]);
      return connection(function(mopidy) {
        return mopidy.tracklist.move({
          start: fromIndex,
          end: fromIndex + 1,
          to_position: toIndex
        });
      });
    };

    $scope.play = function(tlTrack) {
      return connection(function(mopidy) {
        return mopidy.playback.play({tlid: tlTrack.tlid});
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

    $scope.refresh = function() {
      return $scope.reload().finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.reload = function() {
      return connection().then(function(mopidy) {
        return $q.all({
          currentTlTrack: mopidy.playback.getCurrentTlTrack(),
          options: mopidy.tracklist.getOptions(),
          tlTracks: mopidy.tracklist.getTlTracks()
        });
      }).then(function(results) {
        angular.extend($scope, results);
      });
    };

    $scope.remove = function(tlTrack) {
      // update local copy first for user feedback
      var index = $scope.index(tlTrack);
      $scope.tlTracks.splice(index, 1);
      return connection(function(mopidy) {
        return mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
      });
    };

    $scope.saveAs = function() {
      popup.prompt('Playlist Name', 'My Playlist').then(function(name) {
        if (name) {
          connection(function(mopidy) {
            // TODO: error handling
            return mopidy.playlists.create({name: name}).then(function(playlist) {
                var tracks = $scope.tlTracks.map(function(tlTrack) { return tlTrack.track; });
                playlist.tracks = angular.copy(tracks);
                return mopidy.playlists.save({playlist: playlist});
            });
          });
        }
      });
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

    $scope.toggleConsume = function() {
      return connection(function(mopidy) {
        mopidy.tracklist.setConsume({value: !$scope.options.consume});
      });
    };

    $scope.toggleRandom = function() {
      return connection(function(mopidy) {
        mopidy.tracklist.setRandom({value: !$scope.options.random});
      });
    };

    $scope.toggleRepeat = function() {
      return connection(function(mopidy) {
        mopidy.tracklist.setRepeat({value: !$scope.options.repeat});
      });
    };

    $scope.toggleSingle = function() {
      return connection(function(mopidy) {
        mopidy.tracklist.setSingle({value: !$scope.options.single});
      });
    };

    $scope.$on('connection:event:optionsChanged', function() {
      connection(function(mopidy) {
        return mopidy.tracklist.getOptions();
      }).then(function(options) {
        $scope.options = options;
      });
    });

    $scope.$on('connection:event:tracklistChanged', function() {
      connection(function(mopidy) {
        return mopidy.tracklist.getTlTracks();
      }).then(function(tlTracks) {
        $scope.tlTracks = tlTracks;
      });
    });

    $scope.$on('connection:event:trackPlaybackEnded', function() {
      $scope.currentTlTrack = null;
    });

    $scope.$on('connection:event:trackPlaybackStarted', function(event, data) {
      $scope.currentTlTrack = data.tl_track;
    });

    $scope.$on('connection:state:online', function() {
      $scope.reload();
    });

      (function() {
          var promise = null;
          $scope.$watchCollection('tlTracks', function(tlTracks) {
              var tracks = [];
              var images = $scope.images;
              $scope.images = {};
              tlTracks.forEach(function(tlTrack) {
                  var track = tlTrack.track;
                  if (track.uri in images) {
                      $scope.images[track.uri] = images[track.uri];
                  } else {
                      tracks.push(track);
                  }
              });
              if (promise) {
                  paging.cancel(promise);
              }
              promise = paging(function(tracks) {
                  return coverart.getImages(tracks, $scope.thumbnail);
              }, tracks, 10);
              promise.then(angular.noop, angular.noop, function(images) { 
                  angular.extend($scope.images, images); 
              }).then(function() {
                  promise = null;
              });
          });
      })();

    $scope.reload();
  });

  /* @ngInject */
  module.controller('TracklistMenuController', function($scope, popover) {
    var menu = popover.fromTemplateUrl('app/tracklist/menu.html', {
      scope: $scope
    });
    this.show = function($event) {
      return menu.show($event);
    };
    this.hide = function() {
      return menu.hide();
    };
  });

})(angular.module('app.tracklist', ['app.services', 'app.ui']));
