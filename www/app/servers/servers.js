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
  module.controller('ServersController', function($scope, connection, platform, popup, router, storage) {
    $scope.settings = {servers: storage.get('servers')};
    $scope.webSocketUrl = null;

    $scope.add = function(server) {
      $scope.settings.servers.push(server);
      storage.set('servers', $scope.settings.servers);
      // TODO: return promise
    };

    $scope.confirmRemove = function(index) {
      popup.confirm('Remove server').then(function(result) {
        if (result) {
          return $scope.removeServer(index);
        }
      });
    };

    $scope.refresh = function() {
      $scope.$broadcast('scroll.refreshComplete');
    };

    $scope.remove = function(index) {
      $scope.settings.servers.splice(index, 1);
      storage.set('servers', $scope.settings.servers);
    };

    $scope.connect = function(url) {
      connection.reset(url).then(function() {
        return router.clearCache();
      }).then(function() {
        return router.clearHistory();
      }).then(function() {
        return router.go('playback');
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
      return [this.secure ? 'wss' : 'ws', '://', this.host, ':', this.port, this.path].join('');
    };

    this.getConfig = function() {
      return {
        name: this.name,
        url: this.webSocketUrl()
      };
    };
  });

  /* @ngInject */
//  module.run(function($log, $rootScope, connection, platform) {
//    platform.servers().then(
//      function(servers) {
//        if (servers.length) {
//          connection.reset(servers[0].url);
//        }
//        $rootScope.servers = servers;
//      },
//      function(error) {
//        $log.error(error);
//      },
//      function(servers) {
//        $rootScope.servers = servers;
//      }
//    );
//  });
//
})(angular.module('app.servers', ['app.services', 'app.ui', 'ionic']));
