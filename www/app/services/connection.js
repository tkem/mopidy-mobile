;(function(module) {
  'use strict';

  var loadingOptions = {
    delay: undefined,
    duration: undefined
  };

  var settings = {
    // TBD
  };

  /* @ngInject */
  module.provider('connection', function() {
    var provider = this;

    /* @ngInject */
    provider.$get = function($ionicLoading, $log, $q, $timeout, $rootScope, connectionErrorHandler, mopidy) {
      var connected = false;
      var pending = 0;

      function notify(event, data) {
        switch (event) {
        case 'state:online':
          $log.info('Mopidy connection online');
          connected = true;
          break;
        case 'state:offline':
          $log.warn('Mopidy connection offline');
          connected = false;
          break;
        }
        $rootScope.$applyAsync(function(scope) {
          scope.$broadcast('connection:' + event, data);
        });
      }

      function connect(settings) {
        $ionicLoading.show();
        return mopidy(settings).then(
          function(mopidy) {
            connected = true;
            $ionicLoading.hide();
            mopidy.on(notify.bind(mopidy));
            return mopidy;
          },
          function() {
            connected = false;
            $ionicLoading.hide();
            throw {name: 'ConnectionError'};  // TODO: throw real error
          }
        );
      }

      var promise = null;

      var connection = function connection(callback) {
        if (callback) {
          if (pending++ === 0) {
            $ionicLoading.show(loadingOptions);
          }
          return promise.then(callback).finally(function() {
            if (--pending === 0) {
              // see http://forum.ionicframework.com/t/ionicloading-bug/8001
              if (loadingOptions.delay) {
                $timeout(function() {
                  var body = angular.element(document.body);
                  if (!pending && body.hasClass('loading-active')) {
                    $log.debug('Loading overlay still active!');
                    $ionicLoading.hide();
                  }
                }, loadingOptions.delay);
              }
              $ionicLoading.hide();
            } else {
              $log.debug('Requests pending: ' + pending);
            }
          }).catch(function(error) {
            return connectionErrorHandler(error, connection, callback);
          });
        } else {
          return promise;
        }
      };

      connection.reset = function(webSocketUrl) {
        if (promise) {
          promise.finally(function(mopidy) {
            mopidy.close();
            mopidy.off();
          });
        }
        if (webSocketUrl) {
          settings.webSocketUrl = webSocketUrl;
        }
        promise = connect(settings);
        return promise;
      };

      connection.settings = function() {
        return promise.then(function() {
          return settings;
        });
      };

      return connection;
    };

    provider.loadingOptions = function(value) {
      if (arguments.length) {
        angular.extend(loadingOptions, value);
      } else {
        return angular.copy(loadingOptions);
      }
    };

    provider.settings = function(value) {
      if (arguments.length) {
        angular.extend(settings, value);
      } else {
        return angular.copy(settings);
      }
    };
  });

  module.factory('connectionErrorHandler', function($log) {
    return function(error/*, connection, callback*/) {
      if (error.name && error.message) {
        $log.error(error.name + ': ' + error.message, error);
      } else if (error.name) {
        $log.error(error.name, error);
      } else {
        $log.error('Error', error);
      }
      throw error;
    };
  });

})(angular.module('app.services.connection', ['app.services.mopidy', 'ionic']));
