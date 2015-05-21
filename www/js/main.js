angular.module('mopidy-mobile', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.library',
  'mopidy-mobile.playback',
  'mopidy-mobile.playlists',
  'mopidy-mobile.settings',
  'mopidy-mobile.tracklist',
  'mopidy-mobile.util'
])

.config(function($ionicConfigProvider) {
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

.config(function($stateProvider) {
  $stateProvider.state('main', {
    abstract: true,
    url: '',
    controller: 'MainCtrl',
    templateUrl: 'templates/main.html'
  });
})

.config(function($urlRouterProvider, util) {
  if (util.data(document.documentElement, 'webSocketUrl') !== undefined) {
    $urlRouterProvider.otherwise('/playback');
  } else {
    $urlRouterProvider.otherwise('/settings');
  }
})

.config(function(connectionProvider, util) {
  connectionProvider.loadingOptions({
    delay: 100,
    duration: 10000
  });
  connectionProvider.settings({
    backoffDelayMax: 2000,
    backoffDelayMin: 500,
    webSocketUrl: util.data(document.documentElement, 'webSocketUrl')
  });
})

.config(function(coverartProvider) {
  coverartProvider.maxCache(100);
})

.config(function(storageProvider, util) {
  storageProvider.prefix('mopidy-mobile');
  storageProvider.defaults(angular.extend({
    action: 'play',
    coverart: {connection: true},
    theme: 'ionic-light'
  }, util.data(document.documentElement)));
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

.run(function($ionicPlatform, $log, $window, coverart, locale, storage, stylesheet) {
  $ionicPlatform.ready(function() {
    if ($window.cordova) {
      $log.debug('cordova ready');
    }
  });

  // clear local storage on upgrade
  if (storage.get('theme') && storage.get('theme')[0] === '"') {
    storage.clear();
  }
  if (storage.get('locale') && storage.get('locale')[0] === '"') {
    storage.clear();
  }
  if (storage.get('action') && storage.get('action')[0] === '"') {
    storage.clear();
  }

  angular.forEach(storage.get('coverart'), function(enabled, service) {
    if (enabled) {
      coverart.enable(service);
    }
  });

  locale.set(storage.get('locale'));

  var theme = storage.get('theme');
  if (theme) {
    stylesheet.setTheme(theme);
  }
})

.controller('MainCtrl', function($scope) {
  // TODO: get from CSS, image size = device size?
  // TODO: other globals?
  angular.extend($scope, {
    thumbnailWidth: 64,
    thumbnailHeight: 64
  });
});
