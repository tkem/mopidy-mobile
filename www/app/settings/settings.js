;(function(module) {
  'use strict';

  function stringify(obj) {
    try {
      return JSON.stringify(obj);
    } catch(error) {
      return '' + obj;
    }
  }

  function fromKeys(keys, value) {
    var obj = {};
    for (var i = keys.length - 1; i >= 0; --i) {
      obj[keys[i]] = angular.isFunction(value) ? value(keys[i]) : value;
    }
    return obj;
  }

  /* @ngInject */
  module.directive('convertToNumber', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        ngModel.$parsers.push(function(val) {
          return parseInt(val, 10);
        });
        ngModel.$formatters.push(function(val) {
          return '' + val;
        });
      }
    };
  });

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
  module.controller('SettingsController', function($scope, $window, actions, connection, coverart, locale, logging, popup, router, settings, stylesheet) {
    var self = this;
    // TODO: DRY settings defaults
    angular.extend(this, settings.get({
      action: actions.getDefault(),
      coverart: ['mopidy'],
      debug: false,
      stylesheet: stylesheet.get(),
      timeout: 15000,
      volumestep: 10
    }));
    self.coverart = fromKeys(self.coverart, true);
    self.locales = locale.all();

    $scope.$watch(function() {
      return self.action;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        actions.setDefault(newValue);
        settings.extend({action: newValue});
      }
    });

    $scope.$watch(function() {
      return self.debug;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        logging.debugEnabled(newValue);
        settings.extend({debug: newValue});
      }
    });

    $scope.$watch(function() {
      return self.locale;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        locale.set(newValue).then(router.clearCache).then(router.reload);
        settings.extend({locale: newValue});
      }
    });

    $scope.$watch(function() {
      return self.stylesheet;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        stylesheet.set(newValue);
        settings.extend({stylesheet: newValue});
      }
    });

    $scope.$watch(function() {
      return self.timeout;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        connection.requestTimeout(newValue);
        settings.extend({timeout: newValue});
      }
    });

    $scope.$watch(function() {
      return self.volumestep;
    }, function(newValue, oldValue) {
      if (newValue !== oldValue) {
        actions.setVolumeStep(newValue);
        settings.extend({volumestep: newValue});
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
      coverart.use(services);
      settings.extend({coverart: services});
    });
  });

  module.controller('LoggingController', function($log, $scope, $window, logging, platform) {
    angular.extend($scope, {
      clear: logging.clear,
      records: logging.records,
      share: function() {
        var subject = 'Mopidy Mobile ' + $scope.version;
        var message = logging.records.map(function(record) {
          return [record.level, record.time, record.args.map(stringify).join(' ')].join('\t');
        }).join('\n');
        return platform.share(subject, message).then(function(result) {
          $log.debug('Sharing log returned', result);
        }).catch(function(error) {
          $log.error('Error sharing log:', error);
        });
      },
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
        text: 'Share',
        click: 'popover.hide() && share()',
        hidden: '!platform.share',
        hellip: true
      }, {
        text: 'Clear',
        click: 'popover.hide() && clear()'
      }], {
        scope: $scope
      })
    });
  });

  /* @ngInject */
  module.controller('SettingsMenuController', function($scope, $window, popoverMenu, platform, popup, settings) {
    angular.extend($scope, {
      reset: function() {
        popup.confirm('Reset all settings to default values and restart application').then(function(result) {
          if (result) {
            settings.clear();
            $scope.restart();
          }
        });
      },
      restart: function() {
        platform.splashscreen().then(function(splashscreen) {
          splashscreen.show();
        }).finally(function() {
          $window.location.reload(true);
        });
      },
      popover: popoverMenu([{
        text: 'Reset',
        click: 'popover.hide() && reset()',
        hellip: true
      }, {
        text: 'Restart',
        click: 'popover.hide() && restart()',
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
  module.run(function($window, actions, connection, coverart, locale, logging, settings, stylesheet) {
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
      stylesheet: stylesheet.get(),
      timeout: 15000,
      volumestep: 10
    });

    actions.setDefault(obj.action);
    actions.setVolumeStep(obj.volumestep);
    connection.requestTimeout(obj.timeout);
    coverart.use(obj.coverart);
    locale.set(obj.locale);
    logging.debugEnabled(obj.debug);
    stylesheet.set(obj.stylesheet);
  });

})(angular.module('app.settings', ['app.services', 'app.ui']));
