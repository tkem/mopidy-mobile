;(function(module) {
  'use strict';

  /* @ngInject */
  module.service('platform', function($q, $rootElement) {
    this.appVersion = function() {
      return $q.when($rootElement.attr('data-version') || 'dev');
    };

    this.servers = function() {
      var webSocketUrl = $rootElement.attr('data-web-socket-url');
      if (angular.isString(webSocketUrl)) {
        return $q.when([{name: null, url: webSocketUrl}]);
      } else {
        return $q.when([]);
      }
    };
  });
})(angular.module('app.services.platform', ['ionic']));
