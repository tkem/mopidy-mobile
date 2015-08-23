angular.module('mopidy-mobile', [
  'ionic',
  ionic.Platform.isWebView() ? 'ngCordova' : 'ngCordovaMocks',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.coverart.archive',
  'mopidy-mobile.coverart.lastfm',
  'mopidy-mobile.coverart.mopidy',
  'mopidy-mobile.library',
  'mopidy-mobile.locale',
  'mopidy-mobile.locale.de',
  'mopidy-mobile.locale.en',
  'mopidy-mobile.playback',
  'mopidy-mobile.playlists',
  'mopidy-mobile.servers',
  'mopidy-mobile.settings',
  'mopidy-mobile.tracklist'
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
    controller: 'MainCtrl',
    templateUrl: 'templates/main.html',
    url: ''
  });
})

.config(function($urlRouterProvider) {
  if (ionic.Platform.isWebView()) {
    $urlRouterProvider.otherwise('/servers');
  } else {
    $urlRouterProvider.otherwise('/playback');
  }
})

.config(function(connectionProvider) {
  connectionProvider.loadingOptions({
    delay: 100,
    duration: 10000  // defensive
  });
  connectionProvider.settings({
    backoffDelayMax: 2000,
    backoffDelayMin: 500
  });
})

.config(function(coverartProvider) {
  coverartProvider.maxCache(100);
})

.config(function(storageProvider, stylesheetProvider) {
  storageProvider.prefix('mopidy-mobile');
  storageProvider.defaults({
    action: 'play',
    coverart: {mopidy: true},
    locale: '',  // default/browser locale
    servers: [],
    stylesheet: stylesheetProvider.get()
  });
  // TODO: configurable?
  stylesheetProvider.add('css/ionic-dark.min.css');
  stylesheetProvider.add('css/ionic-light.min.css');
})

.controller('MainCtrl', function($scope) {
  // TODO: get from CSS, image size = device size?
  // TODO: other globals?
  angular.extend($scope, {
    thumbnailWidth: 64,
    thumbnailHeight: 64,
    thumbnailSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  });
})

.controller('ServerCtrl', function() {
  this.name = null;
  this.host = null;
  this.path = '/mopidy/ws/';
  this.port = 6680;
  this.secure = false;
  this.webSocketUrl = function() {
    return [this.secure ? 'wss' : 'ws', '://', this.host, ':', this.port, this.path].join('');
  };
  this.getConfig = function() {
    return {
      name: this.name,
      url: this.webSocketUrl()
    };
  };
})

.controller('TrackCtrl', function() {
  this.__model__ = 'Track';
  this.name = null;
  this.uri = null;
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

.run(function($ionicPlatform, $log, $rootElement, $rootScope, $window) {
  $ionicPlatform.ready().then(function() {
    return $rootElement.attr('data-version') || (
      $window.AppVersion ? $window.AppVersion.version : 'dev'
    );
  }).then(function(version) {
    $log.info('Mopidy Mobile ' + version + ' (' + ionic.Platform.platform() + ')');
    $rootScope.version = version;
  });
  $rootScope.platform = ionic.Platform;
})

.run(function($ionicHistory, $rootScope) {
  angular.extend($rootScope, {
    goBack: function() {
      $ionicHistory.nextViewOptions({disableAnimate: true});
      return $ionicHistory.goBack();
    }
  });
})

.run(function($location, $log, coverart, locale, storage, stylesheet) {
  // workaround for lost history/back view after browser reset
  if ($location.url()) {
    $log.debug('Redirecting from ' + $location.url());
    $location.url('');
    $location.replace();
  }
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
})
;
