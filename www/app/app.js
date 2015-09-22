angular.module('app', [
  'app.library',
  'app.locale',
  'app.main',
  'app.playback',
  'app.playlist',
  'app.playlists',
  'app.servers',
  'app.services',
  'app.settings',
  'app.tracklist',
  'app.ui',
  ionic.Platform.isWebView() ? 'ngCordova' : 'ngCordovaMocks',
  'ionic'
]);
