;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'servers': {
        abstract: true,
        controller: 'ServerController',
        template: '<ion-nav-view></ion-nav-view>',
        url: '/servers'
      },
      'servers.add': {
        templateUrl: 'app/servers/add.html',
        url: '/add'
      },
      'servers.edit': {
        templateUrl: 'app/servers/edit.html',
        url: '/edit'
      },
      'servers.view': {
        templateUrl: 'app/servers/view.html',
        url: ''
      }
    });
  });

  module.controller('ServerController', function() {
    this.name = null;
    this.host = null;
    this.path = '/mopidy/ws/';
    this.port = 6680;
    this.secure = false;
    this.webSocketUrl = function() {
      return [this.secure ? 'wss' : 'ws', '://', this.host, ':', this.port, this.path].join('');
    };
    this.getConfig = function() {
      return {
        name: this.name,
        url: this.webSocketUrl()
      };
    };
//
//    angular.extend($scope, {
//      addServer: function(server) {
//        $scope.settings.servers.push(server);
//        storage.set('servers', $scope.settings.servers);
//        return servers().then(function(servers) {
//          $rootScope.servers = servers;
//          return servers;
//        });
//      },
//      confirmRemoveServer: function(index) {
//        popup.confirm('Remove server').then(function(result) {
//          if (result) {
//            return $scope.removeServer(index);
//          }
//        });
//      },
//      connect: function(url) {
//        connection.reset(url).then(function() {
//          router.clearCache();
//        }).then(function() {
//          return router.go('main.playback');
//        }).then(function() {
//          router.clearHistory();
//        });
//      },
//      removeServer: function(index) {
//        $scope.settings.servers.splice(index, 1);
//        storage.set('servers', $scope.settings.servers);
//        return servers().then(function(servers) {
//          $rootScope.servers = servers;
//          return servers;
//        });
//      }
//    });

  });

  module.factory('servers', function($q, $rootElement, $rootScope, $timeout, connection, storage, util, zeroconf) {
    var dataWebSocketUrl = $rootElement.attr('data-web-socket-url');
    return function() {
      var servers = storage.get('servers');
      if (ionic.Platform.isWebView()) {
        return $q(function(resolve) {
          // TODO: figure out ZeroConf.list()
          zeroconf.watch('_mopidy-http._tcp.local.', function(service) {
            var url = service.urls[0].replace(/^http/, 'ws') + '/mopidy/ws/';
            // avoid double entries
            if (!servers.filter(function(obj) { return obj.url === url; }).length) {
              $rootScope.$apply(function() {
                servers.push({
                  name: service.name,
                  url: service.urls[0].replace(/^http/, 'ws') + '/mopidy/ws/'
                });
              });
            }
            resolve(servers);
          });
          $timeout(function() {
            resolve(servers);
          }, 5000);
        });
      } else if (angular.isString(dataWebSocketUrl)) {
        return $q.when(servers.concat(dataWebSocketUrl.split(/\s+/).map(function(url, index) {
          if (index === 0) {
            connection.reset(url);
          }
          return {
            name: 'Mopidy HTTP server on ' + (util.parseURI(url).host || 'default host'),
            url: url
          };
        })));
      } else {
        return $q.when(servers);
      }
    };
  });

  module.run(function($cordovaSplashscreen, $ionicHistory, $ionicPlatform, $q, $rootScope, $state, connection, servers, storage) {
    angular.extend($rootScope, {
      addServer: function(server) {
        storage.set('servers', storage.get('servers').concat(server));
        return servers().then(function(servers) {
          $rootScope.servers = servers;
          return servers;
        });
      },
      connect: function(url) {
        connection.reset(url).then(function() {
          $ionicHistory.clearCache();
        }).then(function() {
          return $state.go('playback');
        }).then(function() {
          $ionicHistory.clearHistory();
        });
      },
      refreshServers: function() {
        servers().then(function(servers) {
          $rootScope.servers = servers;
          $rootScope.$broadcast('scroll.refreshComplete');
        });
      },
      servers: []
    });
    servers().then(function(servers) {
      $ionicPlatform.ready().then(function() {
        $cordovaSplashscreen.hide();
      });
      $rootScope.servers = servers;
    });
  });
})(angular.module('app.servers', ['app.services', 'app.ui', 'ionic']));
