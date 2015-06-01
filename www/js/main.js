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
  'mopidy-mobile.ui',
  'mopidy-mobile.zeroconf'
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
  }).state('servers', {
    templateUrl: 'templates/servers.html',
    url: '/servers'
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
    coverart: {connection: true},
    locale: '',  // default/browser locale
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

.controller('ServersMenuCtrl', function($scope, $window, popoverMenu, popup) {
  angular.extend($scope, {
    confirmRestart: function() {
      popup.confirm('Restart application').then(function(result) {
        if (result) {
          $window.location.reload(true);
        }
      });
    },
    popover: popoverMenu([{
      text: 'Restart',
        click: 'popover.hide() && confirmRestart()',
        hellip: true
    }, {
      text: 'Exit',
      click: 'popover.hide() && platform.exitApp()',
      hidden: '!platform.isWebView()'
    }], {
      scope: $scope
    })
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

.factory('servers', function($log, $q, $rootElement, $rootScope, $timeout, util, webSocketUrl, zeroconf) {
  var dataWebSocketUrl = $rootElement.attr('data-web-socket-url');
  return function() {
    if (ionic.Platform.isWebView()) {
      return $q(function(resolve) {
        var servers = [];
        // TODO: figure out ZeroConf.list()
        zeroconf.watch('_mopidy-http._tcp.local.', function(service) {
          var url = service.urls[0].replace(/^http/, 'ws') + '/mopidy/ws/';
          // avoid double entries
          if (!servers.filter(function(obj) { return obj.url === url; }).length) {
            $rootScope.$apply(function() {
              servers.push({
                name: service.name,
                url: service.urls[0].replace(/^http/, 'ws') + '/mopidy/ws/'
              });
            });
          }
          resolve(servers);
        });
        $timeout(function() {
          resolve(servers);
        }, 5000);
      });
    } else if (angular.isString(dataWebSocketUrl)) {
      return $q.when(dataWebSocketUrl.split(/\s+/).map(function(url, index) {
        if (index === 0) {
          webSocketUrl(url);
        }
        return {
          name: 'Mopidy HTTP server on ' + (util.parseURI(url).host || 'default host'),
          url: url
        };
      }));
    } else {
      return $q.when([]);
    }
  };
})

.provider('webSocketUrl', function(connectionProvider) {
  angular.extend(this, {
    $get: function() {
      return function(webSocketUrl) {
        connectionProvider.settings({webSocketUrl: webSocketUrl});
      };
    }
  });
})

.run(function($cordovaAppVersion, $ionicPlatform, $log, $rootElement, $rootScope) {
  $ionicPlatform.ready().then(function() {
    return $rootElement.attr('data-version') || $cordovaAppVersion.getAppVersion();
  }).then(function(version) {
    $log.info('Mopidy Mobile ' + version + ' (' + ionic.Platform.platform() + ')');
    $rootScope.version = version;
  });
  $rootScope.platform = ionic.Platform;
})

.run(function($cordovaSplashscreen, $ionicHistory, $ionicPlatform, $log, $rootScope, $state, servers, webSocketUrl) {
  angular.extend($rootScope, {
    connect: function(url) {
      webSocketUrl(url);
      $state.go('main.playback').then(function() {
        if ($ionicHistory.backView()) {
          $ionicHistory.clearHistory();
        } else {
          $log.warn('No servers back view');
        }
      });
    },
    refresh: function() {
      servers().then(function(servers) {
        $rootScope.servers = servers;
        $rootScope.$broadcast('scroll.refreshComplete');
      });
    },
    servers: []
  });
  servers().then(function(servers) {
    $ionicPlatform.ready().then(function() {
      $cordovaSplashscreen.hide();
    });
    $rootScope.servers = servers;
  });
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
