angular.module('app', [
  'ionic',
  'pascalprecht.translate',
  'app.controllers',
  'app.directives',
  'app.services'
])

.filter('encode', function() {
  return window.encodeURIComponent;
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $translateProvider, ConfigProvider, MopidyProvider) {
  $stateProvider
    .state('tabs', {
      abstract: true,
      url: '/tabs',
      templateUrl: 'templates/tabs.html'
    })
    .state('tabs.playback', {
      url: '/playback',
      views: {
        'playback': {
          templateUrl: 'templates/playback.html',
          controller: 'PlaybackCtrl'
        }
      }
    })
    .state('tabs.tracklist', {
      url: '/tracklist',
      views: {
        'tracklist': {
          templateUrl: 'templates/tracklist.html',
          controller: 'TracklistCtrl'
        }
      }
    })
    .state('tabs.library', {
      abstract: true,
      url: '/library',
      views: {
        'library': {
          template: '<ion-nav-view></ion-nav-view>',
        }
      }
    })
    .state('tabs.library.root', {
      url: '',
      templateUrl: 'templates/browse.html',
      controller: 'LibraryCtrl',
      data: { 'handler': 'root' },
    })
    .state('tabs.library.browse', {
      url: '/browse?name&uri',
      templateUrl: 'templates/browse.html',
      controller: 'LibraryCtrl',
      data: { 'handler': 'browse' },
    })
    .state('tabs.library.search', {
      url: '/search/?q',
      templateUrl: 'templates/search.html',
      controller: 'LibraryCtrl',
      data: { 'handler': 'search' },
    })
    .state('tabs.playlists', {
      abstract: true,
      url: '/playlists',
      views: {
        'playlists': {
          template: '<ion-nav-view></ion-nav-view>',
        }
      }
    })
    .state('tabs.playlists.root', {
      url: '',
      templateUrl: 'templates/playlists.html',
      controller: 'PlaylistsCtrl'
    })
    .state('tabs.playlists.playlist', {
      url: '/playlist?name&uri',
      templateUrl: 'templates/playlist.html',
      controller: 'PlaylistCtrl'
    })
    .state('tabs.settings', {
      url: '/settings',
      views: {
        'settings': {
          templateUrl: 'templates/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    });

  $urlRouterProvider.otherwise('/tabs/playback');

  // TODO: platform defaults/configurable?
  $ionicConfigProvider.tabs.position('bottom');
  $ionicConfigProvider.tabs.style('standard');

  $translateProvider.useStaticFilesLoader({
    prefix: 'locales/',
    suffix: '.json'
  });
  $translateProvider.preferredLanguage(ConfigProvider.get('language', 'en'));

  // mopidy defaults
  MopidyProvider.settings.backoffDelayMin = 250;
  MopidyProvider.settings.backoffDelayMax = 1000;
  MopidyProvider.settings.callingConvention = 'by-position-or-by-name';
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
