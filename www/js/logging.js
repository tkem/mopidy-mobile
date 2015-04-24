angular.module('mopidy-mobile.logging', [
  'ionic',
  'mopidy-mobile.ui'
])

.config(function($provide, $stateProvider) {
  $provide.decorator('$log', function($delegate, logging) {
    var log = angular.copy($delegate);

    function wrap(type, fn) {
      return function() {
        var args = [].slice.call(arguments);
        logging.log(type, args);
        return fn.apply($delegate, args);
      };
    }

    return angular.extend($delegate, {
      log: wrap('log', log.log),
      info: wrap('info', log.info),
      warn: wrap('warn', log.warn),
      error: wrap('error', log.error),
      debug: wrap('debug', log.debug)
    });
  });

  $stateProvider.state('main.logging', {
    url: '/logging',
    views: {
      'settings': {
        templateUrl: 'templates/logging.html',
        controller: 'LoggingCtrl'
      }
    }
  });
})

.provider('logging', function() {
  var provider = this;
  var enabled = false;
  var debugEnabled = false;
  var maxBufferSize = 20;  // TODO: default?

  angular.extend(provider, {
    enabled: function(flag) {
      if (flag !== undefined) {
        enabled = flag;
        return this;
      } else {
        return enabled;
      }
    },
    debugEnabled: function(flag) {
      if (flag !== undefined) {
        debugEnabled = flag;
        return this;
      } else {
        return debugEnabled;
      }
    },
    maxBufferSize: function(value) {
      if (value !== undefined) {
        maxBufferSize = value;
        return this;
      } else {
        return maxBufferSize;
      }
    }
  });

  provider.$get = function() {
    var records = [];
    return angular.extend(angular.copy(provider), {
      records: records,
      clear: function() {
        records.splice(0, records.length);
      },
      log: function(level, args) {
        if (enabled && (level !== 'debug' || debugEnabled)) {
          var record = {
            time: Date.now(),
            level: level,
            args: args
          };
          if (records.push(record) > maxBufferSize) {
            records.splice(0, records.length - maxBufferSize);
          }
        }
      },
      maxBufferSize: function(value) {
        var ret = provider.maxBufferSize(value);
        if (records.length > maxBufferSize) {
          records.splice(0, records.length - maxBufferSize);
        }
        return ret;
      }
    });
  };
})

.controller('LoggingCtrl', function($scope, logging) {
  $scope.records = logging.records;
  $scope.toJson = angular.toJson;
})

.controller('LoggingMenuCtrl', function($scope, $rootScope, popoverMenu, logging) {
  function createPopoverMenu() {
    return popoverMenu([{
      text: 'Enable',
      model: 'logging.enabled'
    }, {
      text: 'Log debug messages',
      model: 'logging.debugEnabled',
      disabled: '!logging.enabled'
    }, {
      text: 'Clear',
      click: 'popover.hide() && clear()',
      disabled: '!logging.enabled'
    }], {
      scope: $scope
    });
  }

  angular.extend($scope, {
    popover: createPopoverMenu(),
    logging: {
      enabled: logging.enabled(),
      debugEnabled: logging.debugEnabled()
    },
    clear: function() {
      logging.clear();
    }
  });

  $scope.$watch('logging.enabled', function(value) {
    logging.enabled(value);
  });
  $scope.$watch('logging.debugEnabled', function(value) {
    logging.debugEnabled(value);
  });

  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  $rootScope.$on('$translateChangeSuccess', function() {
    var tmp = $scope.popover;
    $scope.popover = createPopoverMenu();
    tmp.remove();
  });
});
