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
  module.run(function($rootScope, platform) {
    $rootScope.platform = platform;
    platform.appVersion().then(function(version) {
      $rootScope.version = version;
    });
  });

  /* @ngInject */
  module.run(function($rootScope, router) {
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

})(angular.module('app.main', ['app.services', 'app.ui', 'ionic']));
