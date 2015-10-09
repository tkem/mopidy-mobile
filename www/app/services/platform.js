;(function(module) {
  'use strict';

  /* @ngInject */
  module.provider('platform', function PlatformProvider() {
    var provider = this;

    provider.isHosted = function() {
      // TODO: $rootElementProvider.$get(), or better way?
      return angular.isString(angular.element(document.body).attr('data-web-socket-url'));
    };

    provider.isWebView = function() {
      return false;
    };

    /* @ngInject */
    provider.$get = function($q, $rootElement) {
      var service = provider;

      service.appVersion = function() {
        return $q.when($rootElement.attr('data-version') || 'dev');
      };

      service.exitApp = function() {
        // scripts may only close windows opened by them
      };

      service.servers = function() {
        var webSocketUrl = $rootElement.attr('data-web-socket-url');
        if (angular.isString(webSocketUrl)) {
          return $q.when([{name: null, url: webSocketUrl}]);
        } else {
          return $q.when([]);
        }
      };

      return service;
    };
  });

})(angular.module('app.services.platform', []));
