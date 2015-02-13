angular.module('mopidy-mobile.settings', [
  'ionic',
  'pascalprecht.translate',
  'mopidy-mobile.connection',
  'mopidy-mobile.logging'
])

.config(function($stateProvider, $translateProvider, connectionProvider, settingsProvider) {
  var html = angular.element(window.document).find('html');

  $stateProvider
    .state('tabs.settings', {
      url: '/settings',
      views: {
        'settings': {
          templateUrl: 'templates/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('tabs.connections', {
      url: '/connections',
      views: {
        'settings': {
          templateUrl: 'templates/connections.html',
          controller: 'ConnectionsCtrl'
        }
      }
    })
    .state('tabs.about', {
      url: '/about',
      views: {
        'settings': {
          templateUrl: 'templates/about.html',
          controller: 'AboutCtrl'
        }
      }
    })
  ;

  connectionProvider.settings.backoffDelayMin(250);  // TODO: config?
  connectionProvider.settings.backoffDelayMax(1000);  // TODO: check behavior...
  connectionProvider.settings.webSocketUrl(settingsProvider.get('webSocketUrl', html.attr('data-ws-url')));

  // TODO: determine browser language
  $translateProvider.preferredLanguage(settingsProvider.get('locale', 'en'));
})

.controller('SettingsCtrl', function($scope, $state, $rootScope, $log, $window, $document, $translate, locales, settings) {
  // TODO: use ws-url if present
  function isWebExtension() {
    return $document.find('html').attr('data-ws-url') !== undefined;
  }

  $scope.settings = {
    webSocketUrl: settings.get('webSocketUrl'),
    locale: settings.get('locale', 'en'),
    stylesheet: settings.get('stylesheet', 'css/ionic.min.css'),
    action: settings.get('action', 'add+play'),
  };

  if (!isWebExtension()) {
    if (!$scope.settings.webSocketUrl) {
      $state.go('^.connections');
    }
    $scope.connections = settings.get('connections');
  }
  $scope.locales = locales;

  $scope.$watch('settings.webSocketUrl', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      if (!newValue) {
        $state.go('^.connections');
      } else {
        settings.set('webSocketUrl', newValue);
        $log.log('Reconnecting to ' + newValue);
        $window.location.hash = '';
        $window.location.reload(true); // FIXME!!!
      }
    }
  });

  $scope.$watch('settings.locale', function(value) {
    settings.set('locale', value);
    $translate.use(value);
  });

  $scope.$watch('settings.stylesheet', function(value) {
    var link = angular.element(document.getElementById('stylesheet'));
    settings.set('stylesheet', value);
    link.attr('href', value);
  });

  $scope.$watch('settings.action', function(value) {
    settings.set('action', value);
  });

  $rootScope.$on('connectionsChanged', function() {
    $scope.connections = settings.get('connections');
    $scope.settings.webSocketUrl = settings.get('webSocketUrl');
  });
})

.controller('ConnectionsCtrl', function($scope, $state, $rootScope, settings) {
  $scope.connection = {
    name: '',
    host: '',
    port: 6680,
    path: '/mopidy/ws/'
  };

  $scope.save = function(connection) {
    // FIXME: check/test connectivity
    var webSocketUrl = 'ws://' + connection.host + ':' + connection.port + connection.path;
    var connections = settings.get('connections', {});
    connections[webSocketUrl] = connection;
    settings.set('connections', connections);
    settings.set('webSocketUrl', webSocketUrl);
    $rootScope.$broadcast('connectionsChanged');
    $state.go('^.settings');
  };
})

.controller('AboutCtrl', function($scope, $document) {
  var version = $document.find('html').attr('data-version');
  // TODO: app version
  $scope.version = version;
  $scope.platform = {
    name: ionic.Platform.platform(),
    device: ionic.Platform.device(),
    version: ionic.Platform.version(),
    isWebView: ionic.Platform.isWebView()
  };
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
      });
    },
    play: function(obj) {
      connection(function(mopidy) {
        return mopidy.tracklist.add(params(obj)).then(function(tlTracks) {
          return mopidy.playback.play({tl_track: tlTracks[0]});
        });
      });
    },
    replace: function(obj) {
      connection(function(mopidy) {
        return mopidy.tracklist.clear().then(function() {
          return mopidy.tracklist.add(params(obj));
        }).then(function(tlTracks) {
          return mopidy.playback.play({tl_track: tlTracks[0]});
        });
      });
    },
  };
  actions['default'] = function(obj) {
    return (actions[settings.get('action', 'play')] || actions.play)(obj);
  };
  return actions;
});
