angular.module('app.services', [])

.factory('Config', function($window) {
    return {
        set: function(key, value) {
            $window.localStorage[key] = value;
        },
        get: function(key, defaultValue) {
            if (key in $window.localStorage) {
                return $window.localStorage[key];
            } else {
                return defaultValue;
            }
        }
    };
})

.provider('Mopidy', function() {
  var provider = this;
  provider.settings = {};

  function isMopidyWebExtension() {
    // TODO: better way?
    var scripts = window.document.scripts;
    for (var i = 0; i != scripts.length; ++i) {
      var src = scripts[i].src || '';
      if (/lib\/mopidy\/.*mopidy\.(min\.)?js$/.test(src)) {
        return false;
      } else if (/mopidy\.(min\.)?js$/.test(src)) {
        return true;
      }
    }
    return false;
  }

  provider.$get = function($log) {
    if (!isMopidyWebExtension() && !provider.settings.webSocketUrl) {
      // TODO: handle via settings
      provider.settings.webSocketUrl = window.prompt(
        'Mopidy WebSocket URL',
        'ws://localhost:6680/mopidy/ws/'
      );
    }
    var mopidy = new Mopidy(provider.settings);
    mopidy.on($log.log.bind($log));
    return mopidy;
  };
});
