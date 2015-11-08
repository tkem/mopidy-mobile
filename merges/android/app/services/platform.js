;(function(module) {
  'use strict';

  // zeroconf
  var servers = {};
  var watchers = 0;

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
    provider.$get = function($ionicPlatform, $log, $q, $timeout, $window) {
      var service = provider;

      service.appVersion = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.AppVersion.version;
        });
      };

      service.exitApp = function() {
        ionic.Platform.exitApp();
      };

      service.servers = function(timeout) {
        return $ionicPlatform.ready().then(function() {
          var deferred = $q.defer();

          $window.ZeroConf.watch('_mopidy-http._tcp.local.', function(obj) {
            var url = obj.service.urls[0];
            $log.debug('zeroconf: ' + obj.action + ' ' + url, obj.service);
            switch (obj.action) {
            case 'added':
              servers[url] = {
                name: obj.service.name,
                url: url.replace(/^http/, 'ws') + '/mopidy/ws/'
              };
              deferred.notify(servers[url]);
              break;
            case 'removed':
              delete servers[url];
              break;
            }
          });

          ++watchers;
          $timeout(timeout).then(function() {
            var result = [];
            angular.forEach(servers, function(server) {
              result.push(server);
            });
            deferred.resolve(result);
            if (--watchers === 0) {
              $window.ZeroConf.unwatch('_mopidy-http._tcp.local.');
              servers = {};
            }
          });

          return deferred.promise;
        });
      };

      service.splashScreen = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.navigator.splashscreen;
        });
      };

      return service;
    };
  });

})(angular.module('app.services.platform', ['ionic']));
