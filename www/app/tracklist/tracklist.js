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
  module.controller('TracklistController', function($q, $scope, connection, coverart, popoverMenu, popup) {
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

    angular.extend($scope, {images: {}, options: {}});

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
      return connection(function(mopidy) {
        return mopidy.tracklist.move({
          start: fromIndex,
          end: fromIndex + 1,
          to_position: toIndex
        });
      });
      // TODO: then(update $scope.tlTracks) -- race condition with event?
    };

    $scope.play = function(tlTrack) {
      return connection(function(mopidy) {
        return mopidy.playback.play({tl_track: angular.copy(tlTrack)});
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
      return connection(function(mopidy) {
        return mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
      });
      // TODO: then(update $scope.tlTracks) -- race condition with event?
    };

    $scope.selectPlaylist = function(track) {
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
    };

    $scope.setConsume = function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setConsume({value: value});
      });
      // TODO: then(update options)
    };

    $scope.setRandom = function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setRandom({value: value});
      });
      // TODO: then(update options)
    };

    $scope.setRepeat = function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setRepeat({value: value});
      });
      // TODO: then(update options)
    };

    $scope.setSingle = function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setSingle({value: value});
      });
      // TODO: then(update options)
    };

    $scope.$on('connection:state:online', function() {
      connection(function(mopidy) {
        return $q.all({
          // TODO: use getCurrentTlid() - how to handle index in title?
          currentTlTrack: mopidy.playback.getCurrentTlTrack(),
          options: mopidy.tracklist.getOptions(),
          tlTracks: mopidy.tracklist.getTlTracks()
        });
      }).then(function(results) {
        angular.extend($scope, results);
      });
    });

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

    $scope.$watchCollection('tlTracks', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        coverart.getImages($scope.getTracks(), {
          width: $scope.thumbnail.width,
          height: $scope.thumbnail.height
        }).then(function(images) {
          $scope.images = images;
        });
      }
    });

    $scope.reload();
  });

  /* @ngInject */
  module.controller('TracklistMenuController', function($scope, connection, popoverMenu, popup) {
    $scope.popover = popoverMenu([{
      text: 'Consume mode',
      model: 'options.consume',
      change: 'setConsume(options.consume)',
    }, {
      text: 'Save as',
      click: 'popover.hide() && saveAs()',
      disabled: '!tlTracks.length',
      hellip: true
    }, {
      text: 'Clear',
      click: 'popover.hide() && confirmClear()',
      disabled: '!tlTracks.length',
      hellip: true
    }], {
      scope: $scope
    });

    $scope.confirmClear = function() {
      popup.confirm('Clear tracklist').then(function(result) {
        if (result) {
          $scope.clear();
        }
      });
    };

    $scope.saveAs = function() {
      popup.prompt('Playlist Name', 'My Playlist').then(function(name) {
        if (name) {
          connection(function(mopidy) {
            // TODO: error handling
            return mopidy.playlists.create({name: name}).then(function(playlist) {
              playlist.tracks = $scope.getTracks();
              return mopidy.playlists.save({playlist: playlist});
            });
          });
        }
      });
    };
  });

})(angular.module('app.tracklist', ['app.services', 'app.ui']));
