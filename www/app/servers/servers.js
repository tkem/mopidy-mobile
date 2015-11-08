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
  module.controller('ServersController', function($log, $q, $rootScope, $scope, $timeout, connection, platform, popup, router, settings) {
    $scope.settings = settings.get({servers: []});
    $scope.zeroconf = {servers: []};

    platform.servers(10000).then(
      function(servers) {
        $scope.zeroconf.servers = servers;
      },
      function(error) {
        $log.error('Error retrieving servers', error);
      },
      function(server) {
        platform.splashScreen().then(function(splashScreen) {
          $timeout(splashScreen.hide, 250);  // give view some time to update
        });
        $scope.zeroconf.servers.push(server);
      }
    );

    $scope.add = function(server) {
      $scope.settings.servers.push(server);
      settings.extend({'servers': $scope.settings.servers});
      return $q.when();
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

    $scope.merge = function() {
      var servers = {};
      for (var i = arguments.length - 1; i >= 0; --i) {
        for (var j = arguments[i].length - 1; j >= 0; --j) {
          var server = arguments[i][j];
          servers[server.url] = server;
        }
      }
      return Object.keys(servers).map(function(url) {
        return servers[url];
      });
    };

    $scope.refresh = function() {
      platform.servers(5000).then(
        function(servers) {
          $scope.zeroconf.servers = servers;
        },
        angular.noop,
        function(server) {
          $scope.zeroconf.servers.push(server);
        }
      );
      $scope.$broadcast('scroll.refreshComplete');
    };

    $scope.remove = function(index) {
      return popup.confirm('Remove server').then(function(result) {
        if (result) {
          $scope.settings.servers.splice(index, 1);
          settings.extend({'servers': $scope.settings.servers});
        }
      });
    };

    $scope.$watchCollection('settings.servers', function(value) {
      $scope.settings = settings.extend({servers: value});
    });
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

  /* @ngInject */
  module.run(function($rootScope, connection, platform) {
    if (platform.isHosted()) {
      platform.servers().then(function(servers) {
        connection.reset(servers[0].url);
      });
    }
  });

  /* @ngInject */
  module.run(function($log, $window, settings) {
    var storage = $window.localStorage;
    var key = 'mopidy-mobile.servers';

    if (storage[key]) {
      settings.extend({servers: angular.fromJson(storage[key])});
      delete storage[key];
    }
  });

})(angular.module('app.servers', ['app.services', 'app.ui']));
