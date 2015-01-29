angular.module('mopidy-mobile.settings', [
  'ionic',
  'pascalprecht.translate',
  'mopidy-mobile.connection'
])

.config(function($stateProvider, $logProvider, $translateProvider, settingsProvider, connectionProvider) {
  $stateProvider.state('tabs.settings', {
    url: '/settings',
    views: {
      'settings': {
        templateUrl: 'templates/settings.html',
        controller: 'SettingsCtrl'
      }
    }
  });
  $logProvider.debugEnabled(settingsProvider.get('debug') === 'true');
  // TODO: determine browser language
  $translateProvider.preferredLanguage(settingsProvider.get('locale', 'en'));
  // TODO: check behavior, config?
  connectionProvider.settings.backoffDelayMin(250);
  connectionProvider.settings.backoffDelayMax(1000);
  connectionProvider.settings.webSocketUrl(settingsProvider.get('webSocketUrl'));
})

.controller('SettingsCtrl', function($scope, $state, $log, $window, $translate, settings, locales) {
  // FIXME: this is a hack!
    $scope.isWebExtension = (function() {
        var scripts = window.document.scripts;
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
    debug: settings.get('debug') === 'true'
  };

  $scope.updateWebSocketUrl = function() {
    var value = $scope.settings.webSocketUrl;
    // FIXME: test first
    settings.set('webSocketUrl', value);
    $log.log('Reconnecting to ' + value);
    $window.location.reload(true); // FIXME!!!
    //connection.reconnect(value);
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

  $scope.$watch('settings.debug', function(value) {
    settings.set('debug', value);
  });
})

.provider('settings', function() {
  var provider = this;
  angular.extend(provider, {
    get: function(key, defaultValue) {
      key = 'mopidy-mobile.' + key;
      if (key in window.localStorage) {
        return window.localStorage[key];
      } else {
        return defaultValue;
      }
    },
    set: function(key, value) {
      key = 'mopidy-mobile.' + key;
      window.localStorage[key] = value;
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
      click: function(mopidy, uri) {
        return trackActions[this.get('action', 'add+play')](mopidy, uri);
      },
    });
  };
});
