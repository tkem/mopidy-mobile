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
      var retries = 0;

      return function(error, connection, callback) {
        try {
          $delegate.apply($delegate, arguments);  // log error
        } catch (e) {
          // default handler throws error
        }

        var options = {
          title: translate(error.name || 'Error'),
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
            retries = 0;
            throw error;
          }
          if (callback) {
            if (++retries % 2 === 0) {
              connection.close();
            }
            var promise = connection(callback);
            promise.then(function() { retries = 0; });
            return promise;
          } else {
            return connection.reset();
          }
        });
      };
    });
  });

  /* @ngInject */
  module.config(function(connectionProvider) {
    connectionProvider.settings({
      backoffDelayMax: 2000,
      backoffDelayMin: 500
    });
  });

  /* @ngInject */
  module.config(function(coverartProvider) {
    coverartProvider.maxCache(1000);
  });

  /* @ngInject */
  module.config(function(platformProvider, routerProvider) {
    routerProvider.state('tabs', {
      abstract: true,
      templateUrl: 'app/main/tabs.html',
      url: ''
    });

    // TODO: move to run()?
    if (platformProvider.isHosted()) {
      routerProvider.fallbackUrl('/playback');
    } else {
      routerProvider.fallbackUrl('/servers');
    }
  });

  /* @ngInject */
  module.config(function(stylesheetProvider) {
    // TODO: configurable?
    stylesheetProvider.add('css/ionic-dark.min.css');
    stylesheetProvider.add('css/ionic-light.min.css');
  });

  /* @ngInject */
  module.controller('TrackController', function() {
    // TODO: move to util?
    this.__model__ = 'Track';
    this.name = null;
    this.uri = null;
  });

  /* @ngInject */
  module.run(function($rootElement, connection) {
    var webSocketUrl = $rootElement.attr('data-web-socket-url');
    if (angular.isString(webSocketUrl)) {
      connection.reset(webSocketUrl);
    }
  });

  /* @ngInject */
  module.run(function($log, $rootScope, actions, platform, router) {
    $rootScope.actions = actions;
    $rootScope.clearCache = router.clearCache.bind(router);
    $rootScope.go = router.go.bind(router);
    $rootScope.goBack = router.goBack.bind(router);
    $rootScope.platform = platform;
    // TODO: get from CSS
    $rootScope.thumbnail = {
      width: 64,
      height: 64,
      src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    };
    $rootScope.getURIScheme = function(uri) {
      return uri ? uri.substr(0, uri.indexOf(':')) : null;
    };
    platform.appVersion().then(function(version) {
      $log.info('Starting Mopidy Mobile ' + version);
      $rootScope.version = version;
    });
  });

})(angular.module('app.main', ['app.services', 'app.ui', 'ionic']));
