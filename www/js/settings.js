angular.module('mopidy-mobile.settings', [
  'ionic',
  'mopidy-mobile.coverart',
  'mopidy-mobile.locale',
  'mopidy-mobile.logging',
  'mopidy-mobile.storage',
  'mopidy-mobile.ui'
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

.controller('SettingsCtrl', function($ionicHistory, $log, $scope, $window, coverart, locale, storage, stylesheet) {
  angular.extend($scope, {
    clear: storage.clear,
    cordova: $window.cordova,
    coverart: {},
    locales: locale.all(),
    settings: {}
  });

  var bindings = [
    storage.bind($scope, 'coverart'),
    storage.bind($scope, 'settings.action', 'action'),
    storage.bind($scope, 'settings.locale', 'locale'),
    storage.bind($scope, 'settings.stylesheet', 'stylesheet')
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

  $scope.$watch('settings.stylesheet', function(value) {
    stylesheet.set(value);
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
