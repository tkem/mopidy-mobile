angular.module('app.controllers', [])

.controller('PlaybackCtrl', function($scope, $log, Mopidy) {
  $scope.formatTime = function(ms) {
    if (ms === undefined || ms === null) {
      return 'n/a';
    }
    var sec = parseInt(ms / 1000) % 60;
    var min = parseInt(ms / 60000);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  };

  Mopidy.then(function(mopidy) {
    mopidy.on('event:muteChanged', function(event) {
      $scope.mute = event.mute;
      $scope.$apply();
    });
    mopidy.on('event:playbackStateChanged', function(event) {
      $scope.state = event.new_state;
      $scope.$apply();
    });
    mopidy.on('event:trackPlaybackEnded', function(/*event*/) {
      $scope.track = null;
      $scope.$apply();
    });
    // mopidy.on("event:trackPlaybackPaused", function(event) {
    //   $scope.track = event.tl_track.track;
    //   $scope.$apply();
    // });
    // mopidy.on("event:trackPlaybackResumed", function(event) {
    //   $scope.track = event.tl_track.track;
    //   $scope.$apply();
    // });
    mopidy.on('event:trackPlaybackStarted', function(event) {
      $scope.track = event.tl_track.track;
      $scope.$apply();
    });
    mopidy.on('event:volumeChanged', function(event) {
      $scope.volume = event.volume;
      $scope.$apply();
    });

    mopidy.playback.getCurrentTlTrack().then(function(tl_track) {
      $scope.track = tl_track ? tl_track.track : null;
      $scope.$apply();
    });
    mopidy.playback.getMute().then(function(mute) {
      $scope.mute = mute;
      $scope.$apply();
    });
    mopidy.playback.getState().then(function(state) {
      $scope.state = state;
      $scope.$apply();
    });
    mopidy.playback.getTimePosition().then(function(time_position) {
      $scope.timePos = time_position;
      $scope.$apply();
    });
    mopidy.playback.getVolume().then(function(volume) {
      $scope.volume = volume;
      $scope.$apply();
    });
  });

  $scope.track = {};
  $scope.play = function() {
    Mopidy.then(function(mopidy) {
      mopidy.playback.play();
    });
  };
  $scope.pause = function() {
    Mopidy.then(function(mopidy) {
      mopidy.playback.pause();
    });
  };
  $scope.stop = function() {
    Mopidy.then(function(mopidy) {
      mopidy.playback.stop();
    });
  };
  $scope.next = function() {
    Mopidy.then(function(mopidy) {
      mopidy.playback.next();
    });
  };
  $scope.previous = function() {
    Mopidy.then(function(mopidy) {
      mopidy.playback.previous();
    });
  };
})

.controller('TracklistCtrl', function($scope, Mopidy) {
  $scope.edit = false;
  $scope.random = false;
  $scope.repeat = false;
  $scope.single = false;
  $scope.consume = false;

  $scope.tlTracks = [];
  $scope.currentTlTrack = null;

  function updateOptions(tracklist) {
    tracklist.getConsume().then(function(consume) {
      $scope.consume = consume;
      $scope.$apply();
    });
    tracklist.getRandom().then(function(random) {
      $scope.random = random;
      $scope.$apply();
    });
    tracklist.getRepeat().then(function(repeat) {
      $scope.repeat = repeat;
      $scope.$apply();
    });
    tracklist.getSingle().then(function(single) {
      $scope.single = single;
      $scope.$apply();
    });
  }

  function updateTracklist(tracklist) {
    tracklist.getTlTracks().then(function(tl_tracks) {
      $scope.tlTracks = tl_tracks;
      $scope.$apply();
    });
  }

  Mopidy.then(function(mopidy) {
    mopidy.on('event:optionsChanged', function() {
      updateOptions(mopidy.tracklist);
    });
    mopidy.on('event:tracklistChanged', function() {
      updateTracklist(mopidy.tracklist);
    });
    mopidy.on('event:trackPlaybackStarted', function(event) {
      $scope.currentTlTrack = event.tl_track;
      $scope.$apply();
    });

    updateOptions(mopidy.tracklist);
    updateTracklist(mopidy.tracklist);
    mopidy.playback.getCurrentTlTrack().then(function(tl_track) {
      $scope.currentTlTrack = tl_track;
    });
  });

  $scope.clear = function() {
    Mopidy.then(function(mopidy) {
      mopidy.tracklist.clear();
    });
  };
  $scope.index = function(tlTrack) {
    for (var i = 0; i != $scope.tlTracks.length; ++i) {
      if ($scope.tlTracks[i].tlid == tlTrack.tlid) {
        return i;
      }
    }
    return null;
  };
  $scope.move = function(tlTrack, fromIndex, toIndex) {
    $scope.tlTracks.splice(fromIndex, 1);
    $scope.tlTracks.splice(toIndex, 0, tlTrack);
  };
  $scope.play = function(tlTrack) {
    Mopidy.then(function(mopidy) {
      mopidy.playback.play({tl_track: angular.copy(tlTrack)});
    });
  };
  $scope.remove = function(tlTrack) {
    Mopidy.then(function(mopidy) {
      mopidy.tracklist.remove({criteria: {tlid: [tlTrack.tlid]}});
    });
  };
})

.controller('LibraryCtrl', function($scope, $state, $stateParams, $log, $timeout, Mopidy) {
  var uri = $stateParams.uri;
  $log.info('browse uri', uri);
  $log.info('browse name', name);
  $scope.uri = uri;
  $scope.name = $stateParams.name;
  $scope.handler = $state.current.data.handler;
  $scope.refs = [];

  $log.log('Mopidy', Mopidy);
  Mopidy.then(function(mopidy) {
    mopidy.library.browse({uri: uri || null}).then(function(refs) {
      $scope.refs = refs;
      $scope.$apply();
    });
  });
  $scope.play = function(ref) {
    $log.log('play', ref);
    Mopidy.then(function(mopidy) {
      $log.log('play: got mopidy', ref);
      mopidy.tracklist.add({uri: ref.uri}).then(function(tlTracks) {
        $log.log('play: added track', ref);
        mopidy.playback.play({tl_track: tlTracks[tlTracks.length - 1]});
      });
    });
  };
  $scope.search = function() {
    $state.go('^.search');
  };
  $scope.refresh = function() {
    $timeout(function() {
      $scope.$broadcast('scroll.refreshComplete');
    }, 1000);
  };
})

.controller('PlaylistsCtrl', function($scope, $timeout) {
  $scope.playlists = [];
  $scope.refresh = function() {
    $timeout(function() {
      $scope.$broadcast('scroll.refreshComplete');
    }, 1000);
  };
})

.controller('SettingsCtrl', function($scope, $state, $log, $ionicHistory, $translate, Config) {
  var link = angular.element(document.getElementById('theme'));
  $scope.language = Config.get('language', 'en');
  $scope.theme = Config.get('theme', 'ionic');
  $log.log('theme', $scope.theme, link.attr('href'));

  $scope.updateTheme = function() {
    Config.set('theme', $scope.theme);
    link.attr('href', 'css/' + $scope.theme + '.css');
    $state.go($state.current, {}, {reload: true});
  };
  $scope.updateLanguage = function() {
    Config.set('language', $scope.language);
    $translate.use($scope.language);
    //window.location.reload(true);
    //$ionicHistory.clearCache();
    //$state.go($state.current, {}, {reload: true});
  };
});
