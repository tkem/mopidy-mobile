angular.module('mopidy-mobile.tracklist', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider
    .state('main.tracklist', {
      abstract: true,
      url: '/tracklist',
      views: {
        'tracklist': {
          template: '<ion-nav-view></ion-nav-view>',
          controller: 'TracklistCtrl'
        }
      }
    })
    .state('main.tracklist.view', {
      url: '',
      templateUrl: 'templates/tracklist.view.html',
    })
    .state('main.tracklist.edit', {
      url: '/edit',
      templateUrl: 'templates/tracklist.edit.html',
    })
  ;
})

.controller('TracklistCtrl', function($scope, $q, $log, connection, coverart) {
  var listeners = {
    'connection:online': function() {
      connection(function(mopidy) {
        return $q.all({
          currentTlTrack: mopidy.playback.getCurrentTlTrack(),
          options: mopidy.tracklist.getOptions(),
          tlTracks: mopidy.tracklist.getTlTracks()
        });
      }).then(function(results) {
        angular.extend($scope, results);
      });
    },
    'event:optionsChanged': function() {
      $q.when(this.tracklist.getOptions()).then(function(options) {
        $scope.options = options;
      });
    },
    'event:tracklistChanged': function() {
      $log.debug('got tracklist changed', this);
      $q.when(this.tracklist.getTlTracks()).then(function(tlTracks) {
        $scope.tlTracks = tlTracks;
      });
    },
    'event:trackPlaybackEnded': function() {
      $scope.currentTlTrack = null;
    },
    'event:trackPlaybackStarted': function(event) {
      $scope.currentTlTrack = event.tl_track;
    }
  };

  angular.extend($scope, {
    images: {},
    options: {},
    tlTracks: [],
    add: function(uris) {
      return connection(function(mopidy) {
        return mopidy.tracklist.add({uris: uris});
      });
    },
    clear: function() {
      return connection(function(mopidy) {
        return mopidy.tracklist.clear();
      });
    },
    getTracks: function() {
      return $scope.tlTracks.map(function(tlTrack) { return tlTrack.track; });
    },
    index: function(tlTrack) {
      var tlid = tlTrack.tlid;
      var tlTracks = $scope.tlTracks;
      for (var i = 0, length = tlTracks.length; i !== length; ++i) {
        if (tlTracks[i].tlid === tlid) {
          return i;
        }
      }
      return -1;
    },
    move: function(fromIndex, toIndex) {
      return connection(function(mopidy) {
        return mopidy.tracklist.move({
          start: fromIndex,
          end: fromIndex + 1,
          to_position: toIndex
        });
      });
    },
    play: function(tlTrack) {
      return connection(function(mopidy) {
        return mopidy.playback.play({tl_track: angular.copy(tlTrack)});
      });
    },
    refresh: function() {
      return connection(function(mopidy) {
        return $q.all({
          currentTlTrack: mopidy.playback.getCurrentTlTrack(),
          options: mopidy.tracklist.getOptions(),
          tlTracks: mopidy.tracklist.getTlTracks()
        });
      }).then(function(results) {
        angular.extend($scope, results);
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    },
    remove: function(tlTrack) {
      return connection(function(mopidy) {
        return mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
      });
    },
    setConsume: function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setConsume({value: value});
      });
    },
    setRandom: function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setRandom({value: value});
      });
    },
    setRepeat: function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setRepeat({value: value});
      });
    },
    setSingle: function(value) {
      return connection(function(mopidy) {
        mopidy.tracklist.setSingle({value: value});
      });
    }
  });

  $scope.$watchCollection('tlTracks', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      coverart.getImages($scope.getTracks(), {
        width: $scope.thumbnailWidth,
        height: $scope.thumbnailHeight
      }).then(function(images) {
        $scope.images = images;
      });
    }
  });

  $scope.$on('$destroy', function() {
    connection.off(listeners);
  });

  connection.on(listeners);
})

.controller('TracklistViewMenuCtrl', function(popoverMenu, popup, $scope) {
  // ??? move options here ???
  angular.extend($scope, {
    playURL: function() {
      popup.prompt('Stream URL', 'http://example.com/stream.mp3').then(function(url) {
        if (url) {
          $scope.add([url]).then(function(tlTracks) {
            $scope.play(tlTracks[0]);
          });
        }
      });
    },
    popover: popoverMenu([{
      text: 'Play stream',
      click: 'popover.hide() && playURL()',
      hellip: true,
    }, {
      text: 'Repeat',
      model: 'options.repeat',
      change: 'setRepeat(options.repeat)',
    }, {
      text: 'Random',
      model: 'options.random',
      change: 'setRandom(options.random)',
    }, {
      text: 'Single',
      model: 'options.single',
      change: 'setSingle(options.single)',
    }, {
      text: 'Consume',
      model: 'options.consume',
      change: 'setConsume(options.consume)',
    }], {
      scope: $scope
    })
  });
})

.controller('TracklistEditMenuCtrl', function(connection, popoverMenu, popup, $scope) {
  angular.extend($scope, {
    save: function() {
      popup.prompt('Playlist Name', 'My Playlist').then(function(name) {
        if (name) {
          connection(function(mopidy) {
            return mopidy.playlists.create({name: name}).then(function(playlist) {
              playlist.tracks = $scope.getTracks();
              return mopidy.playlists.save({playlist: playlist});
            });
          }).then(function() {
            popup.alert('Playlist saved');
          });
        }
      });
    },
    popover: popoverMenu([{
      text: 'Save as',
      click: 'popover.hide() && save()',
      disabled: '!tlTracks.length',
      hellip: true
    }, {
      text: 'Clear',
      click: 'popover.hide() && clear()',
      disabled: '!tlTracks.length',
    }], {
      scope: $scope
    })
  });
});
