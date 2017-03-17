;(function(module) {
  'use strict';

  /* @ngInject */
  module.config(function(routerProvider) {
    routerProvider.states({
      'servers': {
        abstract: true,
        controller: 'ServersController',
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

  /* @ngInject */
  module.controller('ServersController', function($log, $q, $rootScope, $scope, $timeout, connection, mopidy, platform, popup, router, servers, settings) {
    $scope.servers = servers();

    $scope.$on('servers:added', function(event, server) {
      $log.info('Mopidy server added', server);
      $scope.servers = servers();
    });

    $scope.$on('servers:removed', function(event, server) {
      $log.info('Mopidy server removed', server);
      $scope.servers = servers();
    });

    $scope.add = function(server) {
      return $q.when(servers.add(server));
    };

    $scope.connect = function(server, mopidy) {
      $rootScope.webSocketUrl = server.url;
      return connection.reset(server.url, mopidy).then(function() {
        return router.clearCache();
      }).then(function() {
        return router.clearHistory();
      }).then(function() {
        return router.go('playback');
      }).then(function() {
        settings.extend({server: server});
      });
    };

    $scope.refresh = function() {
      servers.refresh().then(function() {
        $scope.servers = servers();
      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    };

    $scope.remove = function(server) {
      return popup.confirm('Remove server').then(function(result) {
        if (result) {
          servers.remove(server);
        }
      });
    };

    if (!$rootScope.webSocketUrl) {
      $q(function(resolve, reject) {
        var options = settings.get({server: null});
        if (options.server && options.server.url) {
          resolve(options.server);
        } else {
          reject();
        }
      }).then(function(server) {
        return mopidy({webSocketUrl: server.url}, 3000).then(function(mopidy) {
          return $scope.connect(server, mopidy);
        }).catch(function(error) {
          $log.warn('Error connecting to ' + server.url, error);
          throw error;
        });
      }).catch(function() {
        platform.splashscreen().then(function(splashscreen) {
          if ($scope.servers.length !== 0) {
            $timeout(splashscreen.hide, 250);  // give view some time to update
          } else {
            var timeout = $timeout(splashscreen.hide, 1000);
            $scope.$on('servers:added', function() {
              $timeout.cancel(timeout);
              splashscreen.hide();
            });
          }
        });
      });
    }
  });

  /* @ngInject */
  module.controller('ServerController', function() {
    this.name = null;
    this.host = null;
    this.path = '/mopidy/ws/';
    this.port = 6680;
    this.secure = false;

    this.webSocketUrl = function() {
      var scheme = this.secure ? 'wss' : 'ws';
      return [scheme, '://', this.host, ':', this.port, this.path].join('');
    };
  });

})(angular.module('app.servers', ['app.services', 'app.ui']));
