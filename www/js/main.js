angular.module('mopidy-mobile', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.library',
  'mopidy-mobile.playback',
  'mopidy-mobile.playlists',
  'mopidy-mobile.settings',
  'mopidy-mobile.tracklist'
])

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
  $stateProvider.state('main', {
    abstract: true,
    url: '',
    templateUrl: 'templates/main.html'
  });

  // TODO: use redirect, otherwise for error page?
  // https://github.com/angular-ui/ui-router/wiki/Frequently-Asked-Questions#how-to-set-up-a-defaultindex-child-state
  if (angular.element(document).find('html').attr('data-ws-url') !== undefined) {
    $urlRouterProvider.otherwise('/playback');
  } else {
    $urlRouterProvider.otherwise('/settings');
  }

  // TODO: platform defaults/configurable?
  $ionicConfigProvider.tabs.position('bottom');
  $ionicConfigProvider.tabs.style('standard');
})

.config(function($provide) {
  $provide.decorator('connectionErrorHandler', function($delegate, $filter, $ionicPopup) {
    var translate = $filter('translate');
    var reset = false;

    return function(error, connection, callback) {
      try {
        $delegate.apply($delegate, arguments);
      } catch (e) {
        // default handler throws error
      }

      var options = {
        title: error.name || translate('Error'),
        subTitle: error.message || '',
        buttons: [{
          text: translate('Ignore'),
          type: 'button-assertive',
          onTap: function() { return false; }
        }, {
          text: translate('Retry'),
          type: 'button-positive',
          onTap: function() { return true; }
        }]
      };
      if (error.data && error.data.message) {
        options.template = '<pre>' + error.data.message + '</pre>';
      }
      return $ionicPopup.show(options).then(function(retry) {
        if (!retry) {
          throw error;
        }
        if (reset) {
          connection.reset();
        } else {
          reset = true;
        }
        return connection(callback, true).finally(function() {
          reset = false;
        });
      });
    };
  });
})

.run(function($rootScope, $filter, $window, $ionicPlatform) {
  $ionicPlatform.ready(function() {
    if ($window.cordova) {
      //$window.alert('cordova ready');
      //$window.alert('cordova getAppVersion ' + $window.cordova.getAppVersion);
      //if ($window.cordova.getAppVersion) {
      //  $window.cordova.getAppVersion(function(version) {
      //    $window.alert('appVersion: ' + version);
      //  });
      //}

      // Hide the accessory bar by default (remove this to show the
      // accessory bar above the keyboard for form inputs)
      //if ($window.cordova.plugins.Keyboard) {
      //  $window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      //}
      //if (window.StatusBar) {
      //  // org.apache.cordova.statusbar required
      //  StatusBar.styleDefault();
      //}
    }
  });

  // FIXME: how to handle $stateChangeError
  //$rootScope.$on('$stateChangeError', popup.stateChangeError);
});
