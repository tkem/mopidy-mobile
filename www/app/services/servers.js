;(function(module) {
  'use strict';

  /* @ngInject */
  module.provider('servers', function() {
    var provider = this;

    /* @ngInject */
    provider.$get = function($log, $rootScope, $timeout, $window, platform, settings) {
      var configured = settings.get({'servers': []}).servers;
      var detected = {};

      function notify(action, server) {
        $rootScope.$applyAsync(function(scope) {
          scope.$broadcast('servers:' + action, angular.copy(server));
        });
      }

      function watch(zeroconf) {
        zeroconf.watch('_mopidy-http._tcp.local.', function(obj) {
          var url = obj.service.urls[0];  // TODO: IPv4/IPv6
          if (url) {
            var server = {
              name: obj.service.name,
              url: url.replace(/^http/, 'ws') + '/mopidy/ws/'
            };
            switch (obj.action) {
            case 'added':
              if (!(url in detected)) {
                detected[url] = server;
                notify(obj.action, server);
              }
              break;
            case 'removed':
              if (url in detected) {
                delete detected[url];
                notify(obj.action, server);
              }
              break;
            }
          }
          $log.debug('zeroconf:' + obj.action + ' ' + url, obj);
        });
      }

      function reset(zeroconf) {
        detected = [];
        zeroconf.close();
        watch(zeroconf);
      }

      platform.zeroconf().then(watch).catch(function(error) {
        $log.error('ZeroConf not available', error);
      });

      function servers() {
        return configured.sort(function(a, b) {
          return a.name.localeCompare(b.name);
        }).map(function(obj) {
          return angular.extend({}, obj, {auto: false});
        }).concat(Object.keys(detected).map(function(url) {
          return angular.extend({}, detected[url], {auto: true});
        }).filter(function(obj) {
          for (var i = 0, n = configured.length; i !== n; ++i) {
            if (configured[i].url === obj.url) {
              return false;
            }
          }
          return true;
        }));
      }

      servers.add = function(server) {
        var obj = {name: server.name, url: server.url};
        configured.push(obj);
        settings.extend({'servers': configured});
        notify('added', obj);
      };

      servers.remove = function(server) {
        configured = configured.filter(function(obj) {
          return obj.name !== server.name || obj.url !== server.url;
        });
        settings.extend({'servers': configured});
        notify('removed', server);
      };

      servers.refresh = function() {
        return platform.zeroconf().then(reset).then(function() {
          return $timeout(1000);  // TODO: resolve on first server found
        }).catch(function(error) {
          $log.error('ZeroConf not available', error);
        });
      };

      return servers;
    };
  });

})(angular.module('app.services.servers', ['app.services.settings', 'ionic']));
