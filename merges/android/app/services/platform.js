;(function(module) {
  'use strict';

  function values(obj) {
    var result = [];
    angular.forEach(obj, function(value) {
      result.push(value);
    });
    return result;
  }

  // zeroconf variables
  var servers = {};
  var service = '_mopidy-http._tcp.local.';
  var watchers = 0;

  /* @ngInject */
  module.service('platform', function($ionicPlatform, $log, $q, $timeout, $window) {
    this.appVersion = function() {
      return $ionicPlatform.ready().then(function() {
        return $window.AppVersion.version;
      });
    };

    this.servers = function() {
      return $ionicPlatform.ready().then(function(timeout) {
        var deferred = $q.defer();

        $window.ZeroConf.watch(service, function(obj) {
          var url = obj.service.urls[0];
          $log.debug('zeroconf:' + obj.action + ' ' + url, obj.service);
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
              deferred.resolve(values(servers));
              if (--watchers === 0) {
                  $window.ZeroConf.unwatch(service);
                  servers = {};
              }
          });

        return deferred.promise();
      });
    };
  });

})(angular.module('app.services.platform', ['ionic']));
