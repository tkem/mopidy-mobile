;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function($ionicConfigProvider) {
    $ionicConfigProvider.tabs.position('bottom');
    $ionicConfigProvider.tabs.style('standard');
  });

  /* @ngInject */
  module.config(function($provide) {
    /* @ngInject */
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
  });

  /* @ngInject */
  module.config(function(connectionProvider) {
    connectionProvider.loadingOptions({
      delay: 100,
      duration: 10000  // defensive
    });
    connectionProvider.settings({
      backoffDelayMax: 2000,
      backoffDelayMin: 500
    });
  });

  /* @ngInject */
  module.config(function(coverartProvider) {
    coverartProvider.maxCache(100);
  });

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.state('tabs', {
      abstract: true,
      templateUrl: 'app/main/tabs.html',
      url: ''
    });

    if (ionic.Platform.isWebView()) {
      routerProvider.fallbackUrl('/servers');
    } else {
      routerProvider.fallbackUrl('/playback');
    }
  });

  /* @ngInject */
  module.config(function(storageProvider, stylesheetProvider) {
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
  });

  /* @ngInject */
  module.run(function($ionicPlatform, $log, $rootElement, $rootScope, $window, router) {
    $ionicPlatform.ready().then(function() {
      return $rootElement.attr('data-version') || (
        $window.AppVersion ? $window.AppVersion.version : 'dev'
      );
    }).then(function(version) {
      $log.info('Mopidy Mobile ' + version + ' (' + ionic.Platform.platform() + ')');
      $rootScope.version = version;
    });
    $rootScope.platform = ionic.Platform;
    $rootScope.goBack = router.goBack.bind(router);
  });

  /* @ngInject */
  module.run(function($rootScope, actions) {
    $rootScope.actions = actions;
  });

  /* @ngInject */
  module.run(function($rootScope) {
    // TODO: get from CSS
    $rootScope.thumbnail = {
      width: 64,
      height: 64,
      src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    };
  });

  /* @ngInject */
  module.run(function($log, coverart, locale, storage, stylesheet) {
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
  });

})(angular.module('app.main', ['app.services', 'app.ui', 'ionic']));
