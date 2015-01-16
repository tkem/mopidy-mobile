angular.module('app', [
  'ionic',
  'app.playback',
  'app.tracklist',
  'app.library',
  'app.playlists',
  'app.settings',
  'app.services',
  'app.locales'
])

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $translateProvider, ConfigProvider, MopidyProvider) {
  $stateProvider.state('tabs', {
    abstract: true,
    url: '/tabs',
    templateUrl: 'templates/tabs.html'
  });

  $urlRouterProvider.otherwise('/tabs/playback');

  // TODO: platform defaults/configurable?
  $ionicConfigProvider.tabs.position('bottom');
  $ionicConfigProvider.tabs.style('standard');

  // TODO: determine browser language
  $translateProvider.preferredLanguage(ConfigProvider.get('locale', 'en'));

  // TODO: check behavior
  MopidyProvider.settings.backoffDelayMin(250);
  MopidyProvider.settings.backoffDelayMax(1000);

  // FIXME: move to settings page/config
  if (!ConfigProvider.get('webSocketUrl') && !MopidyProvider.isWebExtension()) {
    var webSocketUrl = window.prompt(
      'Mopidy WebSocket URL',
      'ws://' + (location.hostname || 'localhost') + ':6680/mopidy/ws/'
    );
    MopidyProvider.settings.webSocketUrl(webSocketUrl);
  }
})

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    //if (window.StatusBar) {
    //  // org.apache.cordova.statusbar required
    //  StatusBar.styleDefault();
    //}
  });
});
