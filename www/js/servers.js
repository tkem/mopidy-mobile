angular.module('mopidy-mobile.servers', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.storage',
  'mopidy-mobile.util',
  'mopidy-mobile.zeroconf'
])

.config(function($stateProvider) {
  $stateProvider.state('servers', {
    abstract: true,
    template: '<ion-nav-view></ion-nav-view>',
    url: '/servers'
  }).state('servers.view', {
    templateUrl: 'templates/servers.view.html',
    url: ''
  }).state('servers.add', {
    templateUrl: 'templates/servers.add.html',
    url: '/add'
  });
})

.factory('servers', function($q, $rootElement, $rootScope, $timeout, connection, storage, util, zeroconf) {
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
})

.run(function($cordovaSplashscreen, $ionicHistory, $ionicPlatform, $q, $rootScope, $state, connection, servers, storage) {
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
        return $state.go('main.playback');
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
})
;
