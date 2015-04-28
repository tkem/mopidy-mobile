angular.module('mopidy-mobile.settings', [
  'ionic',
  'pascalprecht.translate',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.coverartarchive',
  'mopidy-mobile.lastfm',
  'mopidy-mobile.locales',
  'mopidy-mobile.logging',
  'mopidy-mobile.mopidy',
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
  }).state('main.settings.root', {
    url: '',
    templateUrl: 'templates/settings.html',
  }).state('main.settings.servers', {
    url: '/servers',
    templateUrl: 'templates/servers.html'
  }).state('main.settings.server', {
    url: '/servers/{name}',
    templateUrl: 'templates/server.html',
    controller: 'ServerCtrl',
    resolve: {
      name: function($stateParams) {
        return $stateParams.name;
      }
    }
  }).state('main.settings.coverart', {
    url: '/coverart',
    templateUrl: 'templates/coverart.html'
  }).state('main.settings.about', {
    url: '/about',
    templateUrl: 'templates/about.html'
  });
})

.config(function($translateProvider, connectionProvider, coverartProvider, mopidyProvider, settingsProvider, stylesheet, themes) {
  var theme = settingsProvider.get('theme');
  if (theme && theme in themes) {
    stylesheet.setTheme(theme);
  }

  // TODO: configurable?
  connectionProvider.loadingDelay(100);
  connectionProvider.loadingDuration(10000);

  if (settingsProvider.has('webSocketUrl')) {
    mopidyProvider.webSocketUrl(settingsProvider.get('webSocketUrl'));
  } else {
    mopidyProvider.webSocketUrl(angular.element(document).find('html').attr('data-ws-url'));
  }
  mopidyProvider.backoffDelayMin(500);  // TODO: config?
  mopidyProvider.backoffDelayMax(2000);  // TODO: check behavior...

  // TODO: determine browser language
  $translateProvider.preferredLanguage(settingsProvider.get('locale', 'en'));

  angular.forEach(settingsProvider.get('coverart.services', ['connection']), function(service) {
    coverartProvider.enable(service);
  });
  coverartProvider.maxCache(settingsProvider.get('coverart.maxcache', 100));
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

.controller('SettingsCtrl', function($scope, $state, $rootScope, $log, $window, $document, $translate, coverart, locales, settings, stylesheet, themes, util, version) {
  $scope.cordova = $window.cordova;
  $scope.locales = locales;
  $scope.themes = themes;
  $scope.version = version;

  $scope.coverart = {
    services: angular.extend(
      util.fromKeys(['connection', 'coverartarchive', 'lastfm'], false),
      util.fromKeys(settings.get('coverart.services', ['connection']), true)
    ),
    cache: {
      size: coverart.maxCache(),
      clear: coverart.clearCache
    }
  };

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

  $scope.$watchCollection('coverart.services', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      angular.forEach(newValue, function(enabled, service) {
        if (enabled) {
          coverart.enable(service);
        } else {
          coverart.disable(service);
        }
      });
      settings.set('coverart.services', Object.keys(newValue).filter(function(key) {
        return newValue[key];
      }));
    }
  });

  $scope.$watch('coverart.cache.size', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      coverart.maxCache(newValue);
      settings.set('coverart.maxcache', newValue);
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
    if (newValue !== oldValue) {
      $log.log('servers changed', newValue, oldValue);
      settings.set('servers', newValue);
      if (!(util.contains(newValue, $scope.settings.webSocketUrl || ''))) {
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
        popup.alert('Connection error');
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
