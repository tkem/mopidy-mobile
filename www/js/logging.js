angular.module('mopidy-mobile.logging', [
  'ionic',
  'mopidy-mobile.ui'
])

.config(function($provide) {
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
})

.config(function($stateProvider) {
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
  var debugEnabled = false;
  var maxBufferSize = 50;
  var provider = angular.extend(this, {
    $get: function() {
      var records = [];
      return {
        clear: function() {
          records.splice(0, records.length);
        },
        debugEnabled: provider.debugEnabled,
        log: function(level, args) {
          if (level !== 'debug' || debugEnabled) {
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
        records: records
      };
    },
    debugEnabled: function(flag) {
      if (arguments.length) {
        debugEnabled = flag;
      } else {
        return debugEnabled;
      }
    },
    maxBufferSize: function(value) {
      if (arguments.length) {
        maxBufferSize = value;
      } else {
        return maxBufferSize;
      }
    }
  });
})

.controller('LoggingCtrl', function($scope, logging) {
  angular.extend($scope, {
    settings: {
      debug: logging.debugEnabled()
    },
    clear: logging.clear,
    records: logging.records,
    toJson: function(obj) {
      // FIXME: workaround for Error, etc.
      var json = angular.toJson(obj);
      if (json !== '{}') {
        return json;
      } else {
        return obj.toString();
      }
    }
  });

  $scope.$watch('settings.debug', function(value) {
    logging.debugEnabled(value);
  });
})

.controller('LoggingMenuCtrl', function($scope, popoverMenu) {
  angular.extend($scope, {
    popover: popoverMenu([{
      text: 'Debug messages',
      model: 'settings.debug'
    }, {
      text: 'Clear',
      click: 'popover.hide() && clear()'
    }], {
      scope: $scope
    })
  });
});
