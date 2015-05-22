angular.module('mopidy-mobile.settings', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.coverartarchive',
  'mopidy-mobile.lastfm',
  'mopidy-mobile.locale',
  'mopidy-mobile.logging',
  'mopidy-mobile.storage',
  'mopidy-mobile.ui',
  'mopidy-mobile.util'
])

.config(function($stateProvider) {
  $stateProvider.state('main.settings', {
    abstract: true,
    url: '/settings',
    views: {
      'settings': {
        template: '<ion-nav-view></ion-nav-view>',
        controller: 'SettingsCtrl'
      }
    }
  }).state('main.settings.root', {
    url: '',
    templateUrl: 'templates/settings.html',
  }).state('main.settings.interface', {
    url: '/interface',
    templateUrl: 'templates/interface.html'
  }).state('main.settings.coverart', {
    url: '/coverart',
    templateUrl: 'templates/coverart.html'
  }).state('main.settings.licenses', {
    url: '/licenses',
    templateUrl: 'templates/licenses.html'
  }).state('main.settings.about', {
    url: '/about',
    templateUrl: 'templates/about.html'
  });
})

.constant('themes', {
  'ionic-light': 'Ionic Light',
  'ionic-dark': 'Ionic Dark'
})

.controller('SettingsCtrl', function($ionicHistory, $log, $scope, $window, coverart, locale, storage, stylesheet, themes) {
  angular.extend($scope, {
    cordova: $window.cordova,
    coverart: {},
    locales: locale.all(),
    settings: {},
    themes: themes
  });

  var bindings = [
    storage.bind($scope, 'coverart'),
    storage.bind($scope, 'settings.action', 'action'),
    storage.bind($scope, 'settings.locale', 'locale'),
    storage.bind($scope, 'settings.theme', 'theme')
  ];

  $scope.$watchCollection('coverart', function(value) {
    angular.forEach(value, function(enabled, service) {
      if (enabled) {
        coverart.enable(service);
      } else {
        coverart.disable(service);
      }
    });
  });

  $scope.$watch('settings.locale', function(value) {
    $ionicHistory.clearCache();
    locale.set(value);
  });

  $scope.$watch('settings.theme', function(value) {
    stylesheet.setTheme(value);
  });

  $scope.$on('$destroy', function() {
    bindings.forEach(function(unbind) {
      unbind();
    });
  });
})

.controller('SettingsMenuCtrl', function($scope, storage, popoverMenu) {
  angular.extend($scope, {
    clear: storage.clear,
    exit: ionic.Platform.isWebView() ? ionic.Platform.exitApp : null,
    popover: popoverMenu([{
      text: 'Reset',
        click: 'popover.hide() && clear()',
        hellip: true
    }, {
      text: 'Exit',
      click: 'popover.hide() && exit()',
      hidden: '!exit'
    }], {
      scope: $scope
    })
  });
})

.controller('CoverartMenuCtrl', function($scope, coverart, popoverMenu) {
  angular.extend($scope, {
    clearCache: coverart.clearCache,
    popover: popoverMenu([{
      text: 'Clear cache',
      click: 'popover.hide() && clearCache()'
    }], {
      scope: $scope
    })
  });
});
