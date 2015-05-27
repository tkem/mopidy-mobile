angular.module('mopidy-mobile', [
  'ionic',
  ionic.Platform.isWebView() ? 'ngCordova' : 'ngCordovaMocks',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.coverartarchive',
  'mopidy-mobile.lastfm',
  'mopidy-mobile.library',
  'mopidy-mobile.playback',
  'mopidy-mobile.playlists',
  'mopidy-mobile.settings',
  'mopidy-mobile.tracklist',
  'mopidy-mobile.util',
  'mopidy-mobile.ui'
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

.config(function($provide) {
  // http://forum.ionicframework.com/t/state-resolving-and-cached-views-in-beta-14/17870/
  $provide.decorator('$ionicNavViewDelegate', function($delegate) {
    function getByDelegateHref(elements, href) {
      for (var i = elements.length - 1; i >= 0; --i) {
        var element = elements.eq(i);
        if (element.attr('delegate-href') === href) {
          return element;
        }
      }
      return null;
    }
    return angular.extend($delegate, {
      isCached: function(id) {
        for (var i = $delegate._instances.length - 1; i >= 0; --i) {
          var elements = $delegate._instances[i].getViewElements();
          if (getByDelegateHref(elements, id)) {
            return true;
          }
        }
        return false;
      }
    });
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
    duration: 10000  // defensive
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

.config(function(storageProvider, stylesheetProvider, util) {
  storageProvider.prefix('mopidy-mobile');
  storageProvider.defaults(angular.extend({
    action: 'play',
    coverart: {connection: true},
    locale: '',  // default/browser locale
    stylesheet: stylesheetProvider.get()
  }, util.data(document.documentElement)));
  // TODO: configurable?
  stylesheetProvider.add('css/ionic-dark.min.css');
  stylesheetProvider.add('css/ionic-light.min.css');
})

.controller('MainCtrl', function($cordovaSplashscreen, $ionicPlatform, $scope) {
  $ionicPlatform.ready().then(function() {
    $cordovaSplashscreen.hide();
  });
  // TODO: get from CSS, image size = device size?
  // TODO: other globals?
  angular.extend($scope, {
    thumbnailWidth: 64,
    thumbnailHeight: 64,
    thumbnailSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  });
})

.directive('delegateHref', function($state, $stateParams) {
  // http://forum.ionicframework.com/t/state-resolving-and-cached-views-in-beta-14/17870/
  return {
    priority: 1000,
    restrict: 'A',
    compile: function(element, attrs) {
      var href = $state.href($state.current.name, $stateParams);
      attrs.$set('delegateHref', href);
      return angular.noop();
    }
  };
})

.run(function($cordovaAppVersion, $ionicPlatform, $log, $rootElement, $rootScope) {
    $ionicPlatform.ready().then(function() {
        if ($rootElement.attr('data-version')) {
            return $rootElement.attr('data-version');
        } else {
            return $cordovaAppVersion.getAppVersion();
        }
    }).then(function(version) {
        $log.info('Mopidy Mobile ' + version + ' (' + ionic.Platform.platform() + ')');
        $rootScope.version = version;
    });
    $rootScope.platform = ionic.Platform;
})

.run(function($location, $log, coverart, locale, storage, stylesheet) {
  if (storage.get('theme')) {
    $log.warn('Clearing local settings, sorry for the inconvenience...');
    storage.clear();  // clear deprecated settings
  }
  stylesheet.set(storage.get('stylesheet'));
  locale.set(storage.get('locale'));
  angular.forEach(storage.get('coverart'), function(enabled, service) {
    if (enabled) {
      coverart.enable(service);
    }
  });

  // workaround for lost history/back view after browser reset
  if ($location.url()) {
    $log.debug('Redirecting from ' + $location.url());
    $location.url('');
    $location.replace();
  }
})
;
