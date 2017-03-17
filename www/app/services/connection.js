;(function(module) {
  'use strict';

  function TimeoutError(message) {
    this.name = 'TimeoutError';
    this.message = message;
  }

  TimeoutError.prototype = Object.create(Error.prototype);
  TimeoutError.prototype.constructor = TimeoutError;

  var connectionTimeout = null;
  var requestTimeout = null;
  var settings = {};

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

  /* @ngInject */
  module.provider('connection', function() {
    var provider = this;

    /* @ngInject */
    provider.$get = function($log, $q, $timeout, $rootScope, connectionErrorHandler, loading, mopidy)
    {
      function notify(event, data) {
        switch (event) {
        case 'state:online':
          $log.info('Mopidy connection online');
          break;
        case 'state:offline':
          $log.warn('Mopidy connection offline');
          break;
        }
        if (event.indexOf('websocket:') !== 0) {
          $rootScope.$applyAsync(function(scope) {
            scope.$broadcast('connection:' + event, data);
          });
        }
      }

      function connect() {
        loading.show();
        return mopidy(settings, connectionTimeout).then(function(mopidy) {
          mopidy.on(notify.bind(mopidy));
          return mopidy;
        }).finally(loading.hide);
      }

      function request(connection, fn) {
        return connection().then(function(mopidy) {
          loading.show();
          return $q(function(resolve, reject) {
            if (requestTimeout) {
              $timeout(function() { reject(new TimeoutError()); }, requestTimeout);
            }
            $q.when(fn(mopidy)).then(resolve, reject);
          }).finally(loading.hide);
        }).catch(function(error) {
          return $q.when(connectionErrorHandler(error, connection, fn));
        });
      }

      function connection(fn) {
        if (fn) {
          return request(connection, fn);
        } else if (connection._promise) {
          return connection._promise;
        } else {
          return (connection._promise = connect());
        }
      }

      connection.close = function() {
        if (connection._promise) {
          connection._promise.then(function(mopidy) {
            mopidy.close();
            mopidy.off();
          });
          delete connection._promise;
        }
      };

      connection.reset = function(webSocketUrl, mopidy) {
        connection.close();
        if (webSocketUrl) {
          settings.webSocketUrl = webSocketUrl;
        }
        if (mopidy) {
          mopidy.on(notify.bind(mopidy));
          connection._promise = $q.when(mopidy);
        }
        return connection().catch(function(error) {
          return $q.when(connectionErrorHandler(error, connection));
        });
      };

      connection.connectionTimeout = provider.connectionTimeout;

      connection.requestTimeout = provider.requestTimeout;

      connection.settings = function() {
        return angular.copy(settings);
      };

      return connection;
    };

    provider.connectionTimeout = function(value) {
      if (arguments.length) {
        connectionTimeout = value;
      } else {
        return connectionTimeout;
      }
    };

    provider.requestTimeout = function(value) {
      if (arguments.length) {
        requestTimeout = value;
      } else {
        return requestTimeout;
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

})(angular.module('app.services.connection', ['app.services.mopidy', 'app.ui.loading']));
