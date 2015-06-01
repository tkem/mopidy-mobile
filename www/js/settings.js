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
  }).state('main.settings.servers', {
    controller: 'ServerCtrl',
    url: '/servers',
    templateUrl: 'templates/servers.html'
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

.controller('SettingsCtrl', function($ionicHistory, $log, $scope, $window, coverart, locale, popup, storage, stylesheet) {
  angular.extend($scope, {
    locales: locale.all(),
    reset: function(clearSettings) {
      if (clearSettings) {
        storage.clear();
      }
      $window.location.reload(true);
    },
    settings: {}
  });

  storage.bind($scope, 'coverart');
  storage.bind($scope, 'settings.action', 'action');
  storage.bind($scope, 'settings.locale', 'locale');
  storage.bind($scope, 'settings.stylesheet', 'stylesheet');

  $scope.$watchCollection('coverart', function(value) {
    angular.forEach(value, function(enabled, service) {
      if (enabled) {
        coverart.enable(service);
      } else {
        coverart.disable(service);
      }
    });
  });

  $scope.$watch('settings.locale', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $log.info('Locale set to "' + newValue + '"');
      // layout issues with ion-nav-bar back button title:
      // https://github.com/tkem/mopidy-mobile/issues/87
      //$ionicHistory.clearCache();
      //locale.set(newValue);
      popup.confirm('Restart application').then(function(result) {
        if (result) {
          $scope.reset();
        }
      });
    }
  });

  $scope.$watch('settings.stylesheet', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $log.info('Style sheet set to "' + newValue + '"');
      stylesheet.set(newValue);
    }
  });
})

.controller('ServerCtrl', function($ionicHistory, $scope, $state, connection) {
  angular.extend($scope, {
    connect: function(url) {
      connection.reset(url).then(function() {
        $ionicHistory.clearCache();
      }).then(function() {
        return $state.go('main.playback');
      }).then(function() {
        $ionicHistory.clearHistory();
      });
    },
    webSocketUrl: null
  });

  connection.settings().then(function(settings) {
    $scope.webSocketUrl = settings.webSocketUrl;
  });
})

.controller('SettingsMenuCtrl', function($scope, popoverMenu, popup) {
  angular.extend($scope, {
    confirmReset: function() {
      popup.confirm('Reset all settings to default values and restart application').then(function(result) {
        if (result) {
          $scope.reset(true);
        }
      });
    },
    popover: popoverMenu([{
      text: 'Reset',
        click: 'popover.hide() && confirmReset()',
        hellip: true
    }, {
      text: 'Exit',
      click: 'popover.hide() && platform.exitApp()',
      hidden: '!platform.isWebView()'
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
