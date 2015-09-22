;(function(module) {
  'use strict';

  module.config(function($provide) {
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
  });

  module.provider('logging', function() {
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
  });
})(angular.module('app.services.logging', []));
