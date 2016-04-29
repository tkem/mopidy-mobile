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
  module.controller('ServersController', function($log, $q, $rootScope, $scope, $timeout, connection, popup, router, servers) {
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

    $scope.connect = function(url) {
      $rootScope.webSocketUrl = url;
      return connection.reset(url).then(function() {
        return router.clearCache();
      }).then(function() {
        return router.clearHistory();
      }).then(function() {
        return router.go('playback');
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
