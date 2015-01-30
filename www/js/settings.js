angular.module('mopidy-mobile.settings', [
  'ionic',
  'pascalprecht.translate',
  'mopidy-mobile.connection',
  'mopidy-mobile.logging'
])

.config(function($stateProvider, $translateProvider, connectionProvider, loggingProvider, settingsProvider) {
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
    .state('tabs.logging', {
      url: '/logging',
      views: {
        'settings': {
          templateUrl: 'templates/logging.html',
          controller: 'LoggingCtrl'
        }
      }
    })
  ;

  connectionProvider.settings.backoffDelayMin(250);  // TODO: config?
  connectionProvider.settings.backoffDelayMax(1000);  // TODO: check behavior...
  connectionProvider.settings.webSocketUrl(settingsProvider.get('webSocketUrl'));

  angular.forEach(settingsProvider.get('logging'), function(value, key) {
    if (angular.isFunction(loggingProvider[key])) {
      loggingProvider[key](value);
    }
  });
  //$logProvider.debugEnabled(settingsProvider.get('logging.debug') === 'true');

  // TODO: determine browser language
  $translateProvider.preferredLanguage(settingsProvider.get('locale', 'en'));
})

.controller('SettingsCtrl', function($scope, $state, $log, $window, $translate, settings, locales) {
  // FIXME: bettery ways?
  $scope.isWebExtension = (function() {
    var scripts = $window.document.scripts;
    for (var i = 0; i != scripts.length; ++i) {
      if (/\/mopidy\/mopidy\.(min\.)?js$/.test(scripts[i].src || '')) {
        return true;
      }
    }
    return false;
  })();

  $scope.locales = locales;

  $scope.settings = {
    webSocketUrl: settings.get('webSocketUrl'),
    locale: settings.get('locale', 'en'),
    stylesheet: settings.get('stylesheet', 'css/ionic.min.css'),
    action: settings.get('action', 'add+play'),
  };

  $scope.updateWebSocketUrl = function() {
    var value = $scope.settings.webSocketUrl;
    // FIXME: test first
    settings.set('webSocketUrl', value);
    $log.log('Reconnecting to ' + value);
    $window.location.reload(true); // FIXME!!!
  };

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
})

.controller('LoggingCtrl', function($scope, logging, settings) {
  $scope.logging = {
    enabled: logging.enabled(),
    debugEnabled: logging.debugEnabled(),
    maxBufferSize: logging.maxBufferSize()
  };
  $scope.format = angular.toJson;
  $scope.messages = logging.messages;

  $scope.$watch('logging', function(values) {
    logging.enabled(values.enabled);
    logging.debugEnabled(values.debugEnabled);
    logging.maxBufferSize(values.maxBufferSize);
    settings.set('logging', values);
  }, true);
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
    var trackActions = {
      'add': function(mopidy, uri) {
        return mopidy.tracklist.add({uri: uri});
      },
      'add+play': function(mopidy, uri) {
        return mopidy.tracklist.add({uri: uri}).then(function(tlTracks) {
          return mopidy.playback.play({tl_track: tlTracks[0]});
        });
      }
    };

    return angular.extend(provider, {
      set: function(key, value) {
        window.localStorage[prefix + key] = angular.toJson(value);
        return this;
      },
      click: function(mopidy, uri) {
        return trackActions[this.get('action', 'add+play')](mopidy, uri);
      },
    });
  };
});
