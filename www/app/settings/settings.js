;(function(module) {
  'use strict';

  function fromKeys(keys, value) {
    var obj = {};
    for (var i = keys.length - 1; i >= 0; --i) {
      obj[keys[i]] = angular.isFunction(value) ? value(keys[i]) : value;
    }
    return obj;
  }

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
          }
        }
      },
      'settings.root': {
        templateUrl: 'app/settings/index.html',
        url: ''
      },
      'settings.ui': {
        templateUrl: 'app/settings/ui.html',
        url: '/ui'
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
      },
      'settings.servers': {
        abstract: true,
        controller: 'ServersController',
        template: '<ion-nav-view></ion-nav-view>',
        url: '/servers'
      },
      'settings.servers.add': {
        templateUrl: 'app/servers/add.html',
        url: '/add'
      },
      'settings.servers.edit': {
        templateUrl: 'app/servers/edit.html',
        url: '/edit'
      },
      'settings.servers.view': {
        templateUrl: 'app/servers/view.html',
        url: ''
      }
    });
  });

  /* @ngInject */
  module.config(function(settingsProvider) {
    settingsProvider.key('mopidy-mobile');
  });

  /* @ngInject */
  module.controller('SettingsController', function($scope, $window, actions, coverart, locale, logging, popup, settings, stylesheet) {
    var self = this;
    // TODO: DRY settings defaults
    angular.extend(this, settings.get({
      action: actions.getDefault(),
      coverart: ['mopidy'],
      debug: false,
      stylesheet: stylesheet.get()
    }));
    self.coverart = fromKeys(self.coverart, true);
    self.locales = locale.all();

    $scope.$watch(function() {
      return self.action;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        settings.extend({action: newValue});
        actions.setDefault(newValue);
      }
    });

    $scope.$watch(function() {
      return self.debug;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        settings.extend({debug: newValue});
        logging.debugEnabled(newValue);
      }
    });

    $scope.$watch(function() {
      return self.locale;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        settings.extend({locale: newValue});
        // layout issues with ion-nav-bar back button title; see
        // https://github.com/tkem/mopidy-mobile/issues/87
        //
        // router.clearCache();
        // locale.set(newValue);
        popup.confirm('Restart application').then(function(result) {
          if (result) {
            $window.location.reload(true);
          }
        });
      }
    });

    $scope.$watch(function() {
      return self.stylesheet;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        settings.extend({stylesheet: newValue});
        stylesheet.set(newValue);
      }
    });

    $scope.$watchCollection(function() {
      return self.coverart;
    }, function(value) {
      var services = [];
      angular.forEach(value, function(enabled, service) {
        if (enabled) {
          services.push(service);
        }
      });
      settings.extend({coverart: services});
      coverart.services(services);
    });
  });

  module.controller('LoggingController', function($scope, logging) {
    angular.extend($scope, {
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
  module.controller('SettingsMenuController', function($scope, $window, popoverMenu, popup, settings) {
    angular.extend($scope, {
      reset: function() {
        popup.confirm('Reset all settings to default values and restart application').then(function(result) {
          if (result) {
            settings.clear();
            $window.location.reload(true);
          }
        });
      },
      popover: popoverMenu([{
        text: 'Reset',
        click: 'popover.hide() && reset()',
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

  /* @ngInject */
  module.run(function($log, $window, settings) {
    var storage = $window.localStorage;
    var key = 'mopidy-mobile.servers';

    if (storage[key]) {
      settings.extend({servers: angular.fromJson(storage[key])});
      delete storage[key];
    }
  });

  /* @ngInject */
  module.run(function($window, actions, coverart, locale, logging, settings, stylesheet) {
    // migrate pre-1.4 user settings
    var storage = $window.localStorage;
    angular.forEach(['action', 'locale', 'stylesheet'], function(item) {
      var key = 'mopidy-mobile.' + item;
      if (storage[key]) {
        settings.extend(fromKeys([item], angular.fromJson(storage[key])));
        delete storage[key];
      }
    });

    // TODO: DRY defaults
    var obj = settings.get({
      action: actions.getDefault(),
      coverart: ['mopidy'],
      debug: false,
      locale: '',
      stylesheet: stylesheet.get()
    });

    actions.setDefault(obj.action);
    coverart.services(obj.coverart);
    locale.set(obj.locale);
    logging.debugEnabled(obj.debug);
    stylesheet.set(obj.stylesheet);
  });

})(angular.module('app.settings', ['app.services', 'app.ui']));
