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
var dirmap = {
  'local:directory:1': [
    { uri: tracks[0].uri, name: tracks[0].name },
    { uri: tracks[1].uri, name: tracks[1].name },
  ],
  'local:directory:2': [
    { uri: tracks[2].uri, name: tracks[2].name },
  ],
};

angular.module('app.controllers', [])

.controller('PlaybackCtrl', function($scope, Mopidy) {
    $scope.state = 'init';
    $scope.track = {};
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
        $scope.$apply();
    });
    Mopidy.on('event:trackPlaybackEnded', function() {
        $scope.track = {};
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

.controller('LibraryCtrl', function($scope, $state, $stateParams, $log, $ionicPopup, $timeout) {
  //$log.info('library state:', $state.current.data.handler);
  //$log.info('library:', angular.toJson($stateParams));
  var uri = $stateParams.uri;
  $scope.uri = uri;
  $scope.name = uri;
  $scope.handler = $state.current.data.handler;

  if (uri) {
    $scope.refs = dirmap[uri];
  } else {
    $scope.refs = [
      { uri: 'local:directory:1', name: 'Directory #1' },
      { uri: 'local:directory:2', name: 'Directory #2' },
    ];
  }
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
