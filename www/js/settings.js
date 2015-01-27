angular.module('mopidy-mobile.settings', [
  'ionic',
  'mopidy-mobile.connection'
])

.config(function($stateProvider, $logProvider, $translateProvider, settingsProvider, MopidyProvider) {
  $stateProvider.state('tabs.settings', {
    url: '/settings',
    views: {
      'settings': {
        templateUrl: 'templates/settings.html',
        controller: 'SettingsCtrl'
      }
    }
  });

  // TODO: configurable/dev mode?
  $logProvider.debugEnabled(false);
  // TODO: determine browser language
  $translateProvider.preferredLanguage(settingsProvider.get('locale', 'en'));
  // TODO: check behavior, config?
  MopidyProvider.settings.backoffDelayMin(250);
  MopidyProvider.settings.backoffDelayMax(1000);
  // FIXME: move to settings page/config

  var webSocketUrl = settingsProvider.get('webSocketUrl');
  if (webSocketUrl) {
    MopidyProvider.settings.webSocketUrl(webSocketUrl);
  } else if (!MopidyProvider.isWebExtension()) {
    webSocketUrl = window.prompt(
      'Mopidy WebSocket URL',
      'ws://' + (location.hostname || 'localhost') + ':6680/mopidy/ws/'
    );
    MopidyProvider.settings.webSocketUrl(webSocketUrl);
    settingsProvider.set('webSocketUrl', webSocketUrl);
  }
})

.controller('SettingsCtrl', function($scope, $state, $translate, Mopidy, settings, locales) {
  $scope.locales = locales;
  $scope.settings = {
    webSocketUrl: settings.get('webSocketUrl'),
    locale: settings.get('locale', 'en'),
    stylesheet: settings.get('stylesheet', 'css/ionic.min.css'),
    action: settings.get('action', 'add+play')
  };

  $scope.updateWebSocketUrl = function() {
    var value = $scope.settings.webSocketUrl;
    // FIXME: test first
    settings.set('webSocketUrl', value);
    Mopidy.reconnect(value);
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
