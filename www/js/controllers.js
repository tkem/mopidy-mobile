var artist = {
  name: 'Fiona Apple'
};
var album = {
  name: 'The Idler Wheel Is Wiser than the Driver of the Screw and Whipping Cords Will Serve You More than Ropes Will Ever Do',
  artists: [artist],
  images: [
    'http://coverartarchive.org/release-group/6086062c-f943-4b85-b1cb-43558425ec1c/front-250.jpg'
  ]
};
var tracks = [
  { uri: 'local:track:0', name: 'Every Single Night', artists: [artist], album: album },
  { uri: 'local:track:1', name: 'Daredevil', artists: [artist], album: album },
  { uri: 'local:track:2', name: 'Valentine', artists: [artist], album: album },
  { uri: 'local:track:3', name: 'Jonathan', artists: [artist], album: album },
  { uri: 'local:track:4', name: 'Left Alone', artists: [artist], album: album },
  { uri: 'local:track:5', name: 'Werewolf', artists: [artist], album: album },
  { uri: 'local:track:6', name: 'Periphery', artists: [artist], album: album },
  { uri: 'local:track:7', name: 'Regret', artists: [artist], album: album },
  { uri: 'local:track:8', name: 'Anything We Want', artists: [artist], album: album },
  { uri: 'local:track:9', name: 'Hot Knife', artists: [artist], album: album },
];

var tlTracks = [
  { tlid: 0, track: tracks[0] },
  { tlid: 1, track: tracks[1] },
  { tlid: 2, track: tracks[2] },
  { tlid: 3, track: tracks[3] },
  { tlid: 4, track: tracks[4] },
  { tlid: 5, track: tracks[5] },
  { tlid: 6, track: tracks[6] },
  { tlid: 7, track: tracks[7] },
  { tlid: 8, track: tracks[8] },
  { tlid: 9, track: tracks[9] },
];

angular.module('app.controllers', [])

.controller('PlaybackCtrl', function($scope, Mopidy) {
  function formatTime(ms) {
    var sec = parseInt(ms / 1000) % 60;
    var min = parseInt(ms / 60000);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  }

  $scope.state = 'init';
  // TODO
  $scope.timePos = '0:00';
  $scope.timeEnd = 'n/a';

  $scope.track = {};
  $scope.play = function() {
    Mopidy.playback.play();
  };
  $scope.pause = function() {
    Mopidy.playback.pause();
  };
  $scope.stop = function() {
    Mopidy.playback.stop();
  };
  $scope.next = function() {
    Mopidy.playback.next();
  };
  $scope.previous = function() {
    Mopidy.playback.previous();
  };
  Mopidy.on('state:online', function() {
    $scope.state = 'online';
    $scope.$apply();
  });
  Mopidy.on('state:offline', function() {
    $scope.state = 'offline';
    $scope.$apply();
  });
  Mopidy.on('event:trackPlaybackStarted', function(event) {
    $scope.track = event.tl_track.track;
    $scope.timeEnd = formatTime(event.tl_track.track.length);
    $scope.$apply();
  });
  Mopidy.on('event:trackPlaybackEnded', function() {
    $scope.track = {};
    $scope.timeEnd = 'n/a';
    $scope.$apply();
  });
})

.controller('TracklistCtrl', function($scope) {
  $scope.edit = false;
  $scope.random = false;
  $scope.repeat = false;
  $scope.single = false;
  $scope.consume = false;
  $scope.tlTracks = tlTracks;
  $scope.currentTlTrack = null;

  $scope.clear = function() {
    $scope.tlTracks = [];
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
    $scope.currentTlTrack = tlTrack;
  };
  $scope.remove = function(tlTrack) {
    $scope.tlTracks.splice($scope.index(tlTrack), 1);
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

  Mopidy.library.browse({uri: uri || null}).then(function(refs) {
    $scope.refs = refs;
    $scope.$apply();
  });
  $scope.play = function(ref) {
    $log.log('play', ref);
    Mopidy.tracklist.add({uri: ref.uri}).then(function(tlTracks) {
      Mopidy.playback.play({tl_track: tlTracks[tlTracks.length - 1]});
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
  $scope.playlists = [
    { name: 'Playlist 1', tracks: tracks },
    { name: 'Playlist 2', tracks: tracks },
  ];
  $scope.refresh = function() {
    $timeout(function() {
      $scope.$broadcast('scroll.refreshComplete');
    }, 1000);
  };
})

.controller('SettingsCtrl', function($scope, $log, Config) {
  var link = angular.element(document.getElementById('theme'));
  $scope.theme = Config.get('theme', 'ionic');
  $log.log('theme', $scope.theme, link.attr('href'));
  $scope.updateTheme = function() {
    Config.set('theme', $scope.theme);
    link.attr('href', 'css/' + $scope.theme + '.css');
  };
});
