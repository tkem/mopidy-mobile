angular.module('app', [
  'ionic',
  'app.controllers',
  'app.services'
])

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    .state('playback', {
      url: '/playback',
      views: {
        'playback': {
          templateUrl: 'templates/playback.html',
          controller: 'PlaybackCtrl'
        }
      }
    })
    .state('tracklist', {
      url: '/tracklist',
      views: {
        'tracklist': {
          templateUrl: 'templates/tracklist.html',
          controller: 'TracklistCtrl'
        }
      }
    })
    .state('library', {
      abstract: true,
      url: '/library',
      views: {
        'library': {
          template: '<ion-nav-view></ion-nav-view>(Library)',
        }
      }
    })
    .state('library.root', {
      url: '',
      templateUrl: 'templates/browse.html',
      controller: 'LibraryCtrl',
      data: { 'handler': 'root' },
    })
    .state('library.browse', {
      url: '/browse/:uri',
      templateUrl: 'templates/browse.html',
      controller: 'LibraryCtrl',
      data: { 'handler': 'browse' },
    })
    .state('library.search', {
      url: '/search/?q',
      templateUrl: 'templates/browse.html',
      controller: 'LibraryCtrl',
      data: { 'handler': 'search' },
    })
    .state('playlists', {
      url: '/playlists',
      views: {
        'playlists': {
          templateUrl: 'templates/playlists.html',
          controller: 'PlaylistsCtrl'
        }
      }
    })
    .state('settings', {
      url: '/settings',
      views: {
        'settings': {
          templateUrl: 'templates/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    });

  // TODO: platform defaults/configurable?
  $ionicConfigProvider.tabs.position('bottom');
  $ionicConfigProvider.tabs.style('standard');

  $urlRouterProvider.otherwise('/playback.html');
})

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    //if (window.StatusBar) {
    //  // org.apache.cordova.statusbar required
    //  StatusBar.styleDefault();
    //}
  });
});
