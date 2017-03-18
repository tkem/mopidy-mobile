;(function(module) {
  'use strict';

  /* @ngInject */
  module.provider('platform', function PlatformProvider() {
    var provider = this;

    provider.isHosted = function() {
      return angular.isString(angular.element(document.body).attr('data-web-socket-url'));
    };

    provider.isWebView = ionic.Platform.isWebView;

    /* @ngInject */
    provider.$get = function($q, $rootElement) {
      var service = provider;

      service.appVersion = function() {
        return $q.when($rootElement.attr('data-version') || 'develop');
      };

      service.exitApp = function() {
        ionic.Platform.exitApp();
      };

      service.splashscreen = function() {
        return $q.when({show: angular.noop, hide: angular.noop});
      };

      service.updatePlaybackControls = function(/*scope*/) {
        return $q.when(undefined);
      };

      service.updatePlaybackState = function(/*state*/) {
        return $q.when(undefined);
      };

      service.zeroconf = function() {
        return $q.when({watch: angular.noop, unwatch: angular.noop, close: angular.noop});
      };

      return service;
    };
  });

})(angular.module('app.services.platform', ['ionic']));
