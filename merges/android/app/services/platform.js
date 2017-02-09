;(function(module) {
  'use strict';

  /* @ngInject */
  module.provider('platform', function PlatformProvider() {
    var provider = this;

    provider.isHosted = function() {
      return false;
    };

    provider.isWebView = function() {
      return true;
    };

    /* @ngInject */
    provider.$get = function($ionicPlatform, $window) {
      var service = provider;

      service.appVersion = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.AppVersion.version;
        });
      };

      service.exitApp = function() {
        ionic.Platform.exitApp();
      };

      service.share = function(subject, message) {
        return $ionicPlatform.ready().then(function() {
          return $window.plugins.socialsharing.shareWithOptions({
            subject: subject,
            message: message
          });
        });
      };

      service.splashscreen = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.navigator.splashscreen;
        });
      };

      service.zeroconf = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.cordova.plugins.zeroconf;
        });
      };

      return service;
    };
  });

})(angular.module('app.services.platform', ['ionic']));
