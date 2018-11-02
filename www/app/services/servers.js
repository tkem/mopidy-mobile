;(function(module) {
  'use strict';

  /* @ngInject */
  module.provider('servers', function() {
    var provider = this;

    /* @ngInject */
    provider.$get = function($log, $rootScope, $timeout, $window, platform, settings) {
      var configured = settings.get({'servers': []}).servers;
      var detected = {};

      function createServer(service) {
        if (service.ipv4Addresses.length) {
          return {
            name: service.name,
            url: 'ws://' + service.ipv4Addresses[0] + ':' + service.port + '/mopidy/ws/'
          };
        /* FIXME: ignore IPv6 addresses for now
        } else if (service.ipv6Addresses.length) {
          return {
            name: service.name,
            url: 'ws://[' + service.ipv6Addresses[0] + ']:' + service.port + '/mopidy/ws/'
          };
        */
        } else {
          return null;
        }
      }

      function notify(action, server) {
        $rootScope.$applyAsync(function(scope) {
          scope.$broadcast('servers:' + action, angular.copy(server));
        });
      }

      function watch(zeroconf) {
        $log.debug('Starting zeroconf discovery');
        zeroconf.watch('_mopidy-http._tcp.', 'local.', function(obj) {
          $log.debug('Zeroconf:' + obj.action, obj);
          switch (obj.action) {
            case 'added':
              break;
            case 'resolved':
              var server = createServer(obj.service);
              if (server && !(server.url in detected)) {
                detected[server.url] = server;
                notify(obj.action, server);
              }
              break;
            case 'removed':
              var server = createServer(obj.service);
              if (server && server.url in detected) {
                delete detected[server.url];
                notify(obj.action, server);
              }
              break;
          }
        }, function(error) {
          $log.error('Zeroconf error:', error);
        });
      }

      function reset(zeroconf) {
        detected = [];
        zeroconf.close();
        watch(zeroconf);
      }

      platform.zeroconf().then(watch).catch(function(error) {
        $log.error('Zeroconf not available', error);
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
          $log.error('Zeroconf not available', error);
        });
      };

      return servers;
    };
  });

})(angular.module('app.services.servers', ['app.services.settings', 'ionic']));
