angular.module('mopidy-mobile.settings', [
  'ionic',
  'pascalprecht.translate',
  'mopidy-mobile.connection',
  'mopidy-mobile.logging',
  'mopidy-mobile.ui'
])

.config(function($stateProvider) {
  $stateProvider.state('tabs.settings', {
    abstract: true,
    url: '/settings',
    views: {
      'settings': {
        template: '<ion-nav-view></ion-nav-view>',
        controller: 'SettingsCtrl',
        resolve: {
          version: function($q, $document, $window, $log, $ionicPlatform) {
            return $ionicPlatform.ready().then(function() {
              return $q(function(resolve) {
                if ($window.cordova && $window.cordova.getAppVersion) {
                  $window.cordova.getAppVersion(function(version) {
                    resolve(version);
                  });
                } else {
                  resolve($document.find('html').attr('data-version') || 'dev');
                }
              });
            });
          }
        }
      }
    }
  }).state('tabs.settings.root', {
    url: '',
    templateUrl: 'templates/settings.html',
  }).state('tabs.settings.servers', {
    url: '/servers',
    templateUrl: 'templates/servers.html'
  }).state('tabs.settings.server', {
    url: '/servers/{name}',
    templateUrl: 'templates/server.html',
    controller: 'ServerCtrl',
    resolve: {
      name: function($stateParams) {
        return $stateParams.name;
      }
    }
  }).state('tabs.settings.about', {
    url: '/about',
    templateUrl: 'templates/about.html'
  });
})

.config(function($translateProvider, connectionProvider, settingsProvider, stylesheet, themes) {
  var theme = settingsProvider.get('theme');
  if (theme && theme in themes) {
    stylesheet.setTheme(theme);
  }
  if (settingsProvider.has('webSocketUrl')) {
    connectionProvider.settings.webSocketUrl(settingsProvider.get('webSocketUrl'));
  } else {
    connectionProvider.settings.webSocketUrl(angular.element(document).find('html').attr('data-ws-url'));
  }
  connectionProvider.settings.backoffDelayMin(500);  // TODO: config?
  connectionProvider.settings.backoffDelayMax(2000);  // TODO: check behavior...

  // TODO: determine browser language
  $translateProvider.preferredLanguage(settingsProvider.get('locale', 'en'));
})

.constant('stylesheet', {
  getTheme: function() {
    var element = window.document.getElementById('stylesheet');
    var match = /([^.\/]+).min.css(?:\?.*)?$/.exec(element.href);
    //console.log(element.href, match);
    return match ? match[1] : null;
  },
  setTheme: function(name) {
    var element = window.document.getElementById('stylesheet');
    var version = angular.element(document).find('html').attr('data-version');
    element.href = 'css/' + name + '.min.css' + (version ? '?v=' + version : '');
  }
})

.constant('themes', {
  'ionic-light': 'Ionic Light',
  'ionic-dark': 'Ionic Dark'
})

.controller('SettingsCtrl', function($scope, $state, $rootScope, $log, $window, $document, $translate, locales, settings, stylesheet, themes, version) {
  function contains(obj, value) {
    for (var name in obj) {
      if (value === obj[name]) {
        return true;
      }
    }
    return false;
  }

  $scope.locales = locales;
  $scope.themes = themes;
  $scope.version = version;

  $scope.settings = {
    action: settings.get('action', 'play'),
    locale: settings.get('locale', 'en'),
    servers: settings.get('servers', {}),  // TODO: array?
    theme: stylesheet.getTheme(),
    webSocketUrl: settings.get('webSocketUrl', $document.find('html').attr('data-ws-url'))
  };

  $log.debug('Default action', $scope.settings.action);
  $log.debug('Locale', $scope.settings.locale);
  $log.debug('Theme', $scope.settings.theme);
  $log.debug('WebSocket URL', $scope.settings.webSocketUrl);

  // FIXME: better servers as Array?
  $scope.count = function(obj) {
    return Object.keys(obj).length;
  };

  $scope.remove = function(name) {
    delete $scope.settings.servers[name];
  };

  $scope.open = function(href) {
    $window.open(href, '_system');
  };

  $scope.$watch('settings.action', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $log.info('New default action: "' + newValue + '"');
      settings.set('action', newValue);
      //TODO: actions.defaultAction(value);
    }
  });

  $scope.$watch('settings.locale', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $log.info('New locale: "' + newValue + '"');
      settings.set('locale', newValue);
      $translate.use(newValue);
    }
  });

  $scope.$watchCollection('settings.servers', function(newValue, oldValue) {
    if (newValue != oldValue) {
      $log.log('servers changed', newValue, oldValue);
      settings.set('servers', newValue);
      if (!(contains(newValue, $scope.settings.webSocketUrl || ''))) {
        $scope.settings.webSocketUrl = newValue[Object.keys(newValue)[0]];
      }
    }
  });

  $scope.$watch('settings.theme', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $log.info('New theme: "' + newValue + '"');
      stylesheet.setTheme(newValue);
      settings.set('theme', newValue);
    }
  });

  $scope.$watch('settings.webSocketUrl', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $log.log('webSocketUrl changed', newValue, oldValue);
      settings.set('webSocketUrl', newValue);
      $log.log('Reconnecting to ' + newValue);
      // FIXME...
      $window.location.hash = '';
      $window.location.reload(true);
    }
  });

  if ($scope.settings.webSocketUrl === undefined) {
    $state.go('^.server');
  }
})

.controller('ServerCtrl', function($scope, $log, $window, $ionicLoading, popup, name) {
  // TODO: global parseURL function
  function parseWebSocketURL(url) {
    var match = /^ws(s?):\/\/([^:\/]+):(\d*)(\/.*)/.exec(url);
    return match && match.length ? {
      secure: match[1] === 's',
      host: match[2],
      port: $window.parseInt(match[3]),
      path: match[4]
    } : {
      secure: false,
      host: '',
      port: 6680,
      path: '/mopidy/ws'
    };
  }

  var url = name ? $scope.settings.servers[name] : '';

  angular.extend($scope, {
    server: angular.extend(parseWebSocketURL(url), {name: name}),
    getWebSocketURL: function() {
      return [
        $scope.server.secure ? 'wss' : 'ws',
        '://',
        $scope.server.host,
        ':',
        $scope.server.port,
        $scope.server.path
      ].join('');
    },
    test: function(webSocketUrl) {
      var mopidy = new Mopidy({
        autoConnect: false,
        callingConvention: 'by-position-or-by-name',
        webSocketUrl: webSocketUrl
      });
      mopidy.once('state:online', function() {
        $ionicLoading.hide();
        popup.alert('Connection OK');
        mopidy.close();
        mopidy.off();
      });
      mopidy.once('state:offline', function() {
        $ionicLoading.hide();
        popup.alert('Connection Error');
        mopidy.close();
        mopidy.off();
      });
      $ionicLoading.show();
      mopidy.on($log.debug.bind($log));
      mopidy.connect();
    }
  });

  $scope.$on('$ionicView.beforeLeave', function() {
    $log.log('beforeLeave:', $scope.server);
    if ($scope.server.name !== name) {
      delete $scope.settings.servers[name];
    }
    $scope.settings.servers[$scope.server.name] = $scope.getWebSocketURL();
  });
})

.provider('settings', function() {
  var provider = this;
  var prefix = 'mopidy-mobile.';
  angular.extend(provider, {
    get: function(key, defaultValue) {
      key = prefix + key;
      if (key in window.localStorage) {
        try {
          return angular.fromJson(window.localStorage[key]);
        } catch (e) {
          window.console.log('exception', window.localStorage[key]);
          return defaultValue;
        }
      } else {
        return defaultValue;
      }
    },
    has: function(key) {
      return prefix + key in window.localStorage;
    }
  });

  provider.$get = function() {
    return angular.extend(provider, {
      set: function(key, value) {
        window.localStorage[prefix + key] = angular.toJson(value);
        return this;
      }
    });
  };
});
