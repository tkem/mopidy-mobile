angular.module('mopidy-mobile.tracklist', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider.state('main.tracklist', {
    url: '/tracklist',
    views: {
      'tracklist': {
        templateUrl: 'templates/tracklist.html',
        controller: 'TracklistCtrl'
      }
    }
  });
})

.controller('TracklistCtrl', function($scope, $document, $log, $timeout, $ionicScrollDelegate, connection, coverart) {
  $log.debug('creating tracklist view');

  function anchorScroll(handle, id, shouldAnimate) {
    var delegate = $ionicScrollDelegate.$getByHandle(handle);
    var elem = $document[0].getElementById(id);
    var left = 0, top = 0;
    do {
      if (elem !== null) {
        left += elem.offsetLeft;
      }
      if (elem !== null) {
        top += elem.offsetTop;
      }
      elem = elem.offsetParent;
    } while (elem.offsetParent);
    $timeout(function() {
      $log.log('scroll to ', left, top);
      delegate.scrollTo(left, top - 100, shouldAnimate);
    });
  }

  var listeners = connection.on({
    'event:optionsChanged': function() {
      connection(function(mopidy) {
        return mopidy.tracklist.getOptions();
      }).then(function(options) {
        $scope.options = options;
      });
    },
    'event:tracklistChanged': function() {
      connection(function(mopidy) {
        return mopidy.constructor.when.join(
          mopidy.playback.getCurrentTlTrack(),
          mopidy.tracklist.getTlTracks()
        );
      }).then(function(results) {
        $scope.currentTlTrack = results[0];
        $scope.tlTracks = results[1];
        coverart.getImages($scope.getTracks(), {
          width: $scope.thumbnailWidth,
          height: $scope.thumbnailHeight
        }).then(function(images) {
          // TODO: cleanup
          $scope.images = images;
        });
      });
    },
    'event:trackPlaybackEnded': function() {
      $scope.currentTlTrack = null;
    },
    'event:trackPlaybackStarted': function(event) {
      $scope.currentTlTrack = event.tl_track;
    },
    'state:online': function() {
      $log.info('(re)connect: refreshing tracklist view');
      $scope.refresh();
    }
  });

  angular.extend($scope, {
    options: {},
    tlTracks: [],
    images: {},
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
    play: function(tlTrack) {
      connection(function(mopidy) {
        return mopidy.playback.play({tl_track: angular.copy(tlTrack)});
      }, true);
    },
    remove: function(tlTrack) {
      connection(function(mopidy) {
        return mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
      }, true);
    },
    setOptions: function(params) {
      connection(function(mopidy) {
        var promises = [];
        if ('consume' in params) {
          promises.push(mopidy.tracklist.setConsume({value: params.consume}));
        }
        if ('random' in params) {
          promises.push(mopidy.tracklist.setRandom({value: params.random}));
        }
        if ('repeat' in params) {
          promises.push(mopidy.tracklist.setRepeat({value: params.repeat}));
        }
        if ('single' in params) {
          promises.push(mopidy.tracklist.setSingle({value: params.single}));
        }
        return Mopidy.when.all(promises);
      }, true);
    },
    refresh: function() {
      connection(function(mopidy) {
        return mopidy.constructor.when.join(
          mopidy.playback.getCurrentTlTrack(),
          mopidy.tracklist.getOptions(),
          mopidy.tracklist.getTlTracks()
        );
      }).then(function(results) {
        $scope.currentTlTrack = results[0];
        $scope.options = results[1];
        $scope.tlTracks = results[2];
        coverart.getImages($scope.getTracks(), {
          width: $scope.thumbnailWidth,
          height: $scope.thumbnailHeight
        }).then(function(images) {
          // TODO: cleanup
          $scope.images = images;
        });
        if ($scope.currentTlTrack) {
          $timeout(function() {
            anchorScroll('tracklistScroll', 'tlid-' + $scope.currentTlTrack.tlid, true);
          });
        }
      });
    }
  });

  $scope.$on('$ionicView.enter', function() {
    $log.debug('entering tracklist view');
    // defensive action...
    $scope.refresh();
  });

  $scope.$on('$destroy', function() {
    $log.debug('destroying tracklist view');
    connection.off(listeners);
  });
})

.controller('TracklistMenuCtrl', function($scope, $rootScope, connection, popoverMenu, popup) {
  function createPopoverMenu() {
    return popoverMenu([{
      text: 'Clear',
      click: 'popover.hide() && clear()',
      disabled: '!tlTracks.length',
      hellip: true
    }, {
      text: 'Stream URL',
      click: 'popover.hide() && playURL()',
      hellip: true
    }, {
      text: 'Save as',
      click: 'popover.hide() && save()',
      disabled: '!tlTracks.length',
      hellip: true
    }], {
      scope: $scope
    });
  }

  angular.extend($scope, {
    popover: createPopoverMenu(),
    playURL: function() {
      popup.prompt('Stream URL', 'http://example.com/stream.mp3').then(function(url) {
        if (url) {
          connection(function(mopidy) {
            return mopidy.tracklist.add({uri: url}).then(function(tlTracks) {
              return mopidy.playback.play({tl_track: tlTracks[0]});
            });
          }, true);
        }
      });
    },
    clear: function() {
      popup.confirm('Clear Tracklist').then(function(result) {
        if (result) {
          connection(function(mopidy) {
            return mopidy.tracklist.clear();
          }, true);
        }
      });
    },
    save: function() {
      popup.prompt('Playlist Name', 'My Playlist').then(function(name) {
        if (name) {
          connection(function(mopidy) {
            return mopidy.playlists.create({name: name}).then(function(playlist) {
              playlist.tracks = $scope.getTracks();
              return mopidy.playlists.save({playlist: playlist});
            });
          }, true).then(function() {
            popup.alert('Playlist saved');
          });
        }
      });
    }
  });

  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  $rootScope.$on('$translateChangeSuccess', function() {
    var tmp = $scope.popover;
    $scope.popover = createPopoverMenu();
    tmp.remove();
  });
});
