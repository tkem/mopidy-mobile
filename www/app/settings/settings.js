;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'settings': {
        abstract: true,
        parent: 'tabs',
        url: '/settings',
        views: {
          'settings': {
            template: '<ion-nav-view></ion-nav-view>',
            controller: 'SettingsController'
          }
        }
      },
      'settings.root': {
        templateUrl: 'app/settings/settings.html',
        url: ''
      },
      'settings.interface': {
        templateUrl: 'app/settings/interface.html',
        url: '/interface'
      },
      'settings.coverart': {
        templateUrl: 'app/settings/coverart.html',
        url: '/coverart'
      },
      'settings.logging': {
        controller: 'LoggingController',
        templateUrl: 'app/settings/logging.html',
        url: '/logging'
      },
      'settings.licenses': {
        templateUrl: 'app/settings/licenses.html',
        url: '/licenses'
      },
      'settings.about': {
        templateUrl: 'app/settings/about.html',
        url: '/about'
      }
    });
  });

  /* @ngInject */
  module.controller('SettingsController', function(connection, coverart, locale, popup, router, storage, stylesheet, $log, $q, $rootScope, $scope, $window) {
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

    storage.bind($scope, 'settings.coverart', 'coverart');
    storage.bind($scope, 'settings.action', 'action');
    storage.bind($scope, 'settings.locale', 'locale');
    storage.bind($scope, 'settings.stylesheet', 'stylesheet');

    $scope.$watchCollection('settings.coverart', function(value) {
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
        //router.clearCache();
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

    connection.settings().then(function(settings) {
      $scope.webSocketUrl = settings.webSocketUrl;
    });
  });

  module.controller('LoggingController', function($scope, logging) {
    angular.extend($scope, {
      settings: {
        debug: logging.debugEnabled()
      },
      clear: logging.clear,
      records: logging.records,
      toJson: function(obj) {
        // FIXME: workaround for Error, etc.
        var json = angular.toJson(obj);
        if (json !== '{}') {
          return json;
        } else {
          return obj.toString();
        }
      }
    });

    $scope.$watch('settings.debug', function(value) {
      logging.debugEnabled(value);
    });
  });

  module.controller('LoggingMenuController', function($scope, popoverMenu) {
    angular.extend($scope, {
      popover: popoverMenu([{
        text: 'Debug messages',
        model: 'settings.debug'
      }, {
        text: 'Clear',
        click: 'popover.hide() && clear()'
      }], {
        scope: $scope
      })
    });
  });

  /* @ngInject */
  module.controller('SettingsMenuController', function($scope, popoverMenu, popup) {
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
  });

  /* @ngInject */
  module.controller('CoverartMenuController', function($scope, coverart, popoverMenu) {
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

})(angular.module('app.settings', ['app.services', 'app.ui']));
