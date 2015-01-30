angular.module('mopidy-mobile.logging', ['ionic'])

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
    var id = 0;
    var messages = [];
    return angular.extend(angular.copy(provider), {
      log: function(type, args) {
        if (enabled) {
          if (type !== 'debug' || debugEnabled) {
            messages.push({id: id++, type: type, args: args});
            if (messages.length > maxBufferSize) {
              messages.splice(0, messages.length - maxBufferSize);
            }
          }
        }
      },
      maxBufferSize: function(value) {
        var ret = provider.maxBufferSize(value);
        if (messages.length > maxBufferSize) {
          messages.splice(0, messages.length - maxBufferSize);
        }
        return ret;
      },
      messages: messages
    });
  };
});
