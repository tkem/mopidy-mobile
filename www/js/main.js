angular.module('mopidy-mobile', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.library',
  'mopidy-mobile.locales',
  'mopidy-mobile.logging',
  'mopidy-mobile.playback',
  'mopidy-mobile.playlists',
  'mopidy-mobile.popup',
  'mopidy-mobile.settings',
  'mopidy-mobile.tracklist',
])

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
  $stateProvider.state('tabs', {
    abstract: true,
    url: '/tabs',
    templateUrl: 'templates/tabs.html'
  });

  $urlRouterProvider.otherwise('/tabs/settings');
  // TODO: platform defaults/configurable?
  $ionicConfigProvider.tabs.position('bottom');
  $ionicConfigProvider.tabs.style('standard');
})

.run(function($rootScope, $window, $ionicPlatform, popup) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the
    // accessory bar above the keyboard for form inputs)
    if ($window.cordova && $window.cordova.plugins.Keyboard) {
      $window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    //if (window.StatusBar) {
    //  // org.apache.cordova.statusbar required
    //  StatusBar.styleDefault();
    //}
  });

  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
      popup.error(error);
  });
});
