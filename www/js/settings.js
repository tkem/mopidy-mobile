angular.module('mopidy-mobile.settings', [
  'ionic',
  'pascalprecht.translate',
  'mopidy-mobile.connection',
  'mopidy-mobile.logging',
  'mopidy-mobile.ui'
])

.config(function($stateProvider, $translateProvider, connectionProvider, settingsProvider) {
  var html = angular.element(window.document).find('html');

  $stateProvider
    .state('tabs.settings', {
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
    })
    .state('tabs.settings.root', {
      url: '',
      templateUrl: 'templates/settings.html',
    })
    .state('tabs.settings.servers', {
      url: '/servers',
      templateUrl: 'templates/servers.html'
    })
    .state('tabs.settings.server', {
      url: '/servers/{name}',
      templateUrl: 'templates/server.html',
      controller: 'ServerCtrl',
      resolve: {
        name: function($stateParams) {
          return $stateParams.name;
        }
      }
    })
    .state('tabs.settings.about', {
      url: '/about',
      templateUrl: 'templates/about.html'
    })
  ;

  connectionProvider.settings.backoffDelayMin(500);  // TODO: config?
  connectionProvider.settings.backoffDelayMax(2000);  // TODO: check behavior...
  connectionProvider.settings.webSocketUrl(settingsProvider.get('webSocketUrl', html.attr('data-ws-url')));

  // TODO: determine browser language
  $translateProvider.preferredLanguage(settingsProvider.get('locale', 'en'));

  var stylesheet = settingsProvider.get('stylesheet');
  if (stylesheet) {
    angular.element(document.getElementById('stylesheet')).attr('href', stylesheet);
  }
})

.controller('SettingsCtrl', function($scope, $state, $rootScope, $log, $window, $document, $translate, locales, settings, version) {
  $log.info('Create SettingsCtrl');

  function contains(obj, value) {
    for (var name in obj) {
      if (value === obj[name]) {
        return true;
      }
    }
    return false;
  }

  $scope.locales = locales;
  $scope.version = version;

  $scope.settings = {
    action: settings.get('action', 'play'),
    locale: settings.get('locale', 'en'),
    servers: settings.get('servers', {}),  // TODO: array?
    stylesheet: settings.get('stylesheet', 'css/ionic.min.css'),
    webSocketUrl: settings.get('webSocketUrl', $document.find('html').attr('data-ws-url'))
  };

  // FIXME: better servers as Array?
  $scope.count = function(obj) {
    return Object.keys(obj).length;
  };

  $scope.remove = function(name) {
    delete $scope.settings.servers[name];
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

  $scope.$watch('settings.stylesheet', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $log.info('New stylesheet: "' + newValue + '"');
      settings.set('stylesheet', newValue);
      $document[0].getElementById('stylesheet').href = newValue;  // TODO: ?v=version
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

.controller('ServerCtrl', function($scope, $rootScope, $log, $state, $window, $ionicNavBarDelegate, popup, name) {
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
    test: function() {
      popup.alert('Not implemented yet');
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
})

.factory('actions', function(connection, settings) {
  function params(obj) {
    if (angular.isArray(obj)) {
      if (obj.length && obj[0].__type__ === 'Track') {
        return {tracks: obj};
      } else {
        return {uris: obj.map(function(model) { return model.uri; })};
      }
    } else {
      if (obj.__type__ === 'Track') {
        return {tracks: [obj]};
      } else {
        return {uri: obj.uri};
      }
    }
  }

  var actions = {
    add: function(obj) {
      connection(function(mopidy) {
        return mopidy.tracklist.add(params(obj));
      }, true);
    },
    play: function(obj) {
      connection(function(mopidy) {
        return mopidy.tracklist.add(params(obj)).then(function(tlTracks) {
          return mopidy.playback.play({tl_track: tlTracks[0]});
        });
      }, true);
    },
    replace: function(obj) {
      connection(function(mopidy) {
        return mopidy.tracklist.clear().then(function() {
          return mopidy.tracklist.add(params(obj));
        }).then(function(tlTracks) {
          return mopidy.playback.play({tl_track: tlTracks[0]});
        });
      }, true);
    },
  };
  actions['default'] = function(obj) {
    return (actions[settings.get('action', 'play')] || actions.play)(obj);
  };
  return actions;
});
