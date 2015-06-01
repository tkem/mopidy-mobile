angular.module('mopidy-mobile.zeroconf', [
  'ionic',
])

.provider('zeroconf', function() {
  var provider = angular.extend(this, {
    $get: function($ionicPlatform, $log, $q, $window) {
      var promise = $ionicPlatform.ready().then(function() {
        if ($window.ZeroConf) {
          return $window.ZeroConf;
        } else {
          return {
            list: function(type, timeout, success) {
              success([]);
            },
            watch: function() {
            }
          };
        }
      });
      return {
        list: function(type, timeout) {
          return promise.then(function(zeroconf) {
            return $q(function(resolve, reject) {
              zeroconf.list(type, timeout || provider.timeout, function(obj) {
                $log.debug('zeroconf:' + obj.action, obj.service);
                if (angular.isArray(obj.service)) {
                  resolve(obj.service);
                } else {
                  resolve([obj.service]);
                }
              }, reject);
            });
          });
        },
        watch: function(type, added, removed) {
          return promise.then(function(zeroconf) {
            zeroconf.watch(type, function(obj) {
              $log.debug('zeroconf:' + obj.action, obj.service);
              switch (obj.action) {
              case 'added':
                (added || angular.noop)(obj.service);
                break;
              case 'removed':
                (removed || angular.noop)(obj.service);
                break;
              }
            });
          });
        }
      };
    },
    timeout: 6000
  });
});
