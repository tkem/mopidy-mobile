angular.module('app.services', [])

.provider('Config', function() {
  var provider = this;
  provider.get = function(key, defaultValue) {
    if (key in window.localStorage) {
      return window.localStorage[key];
    } else {
      return defaultValue;
    }
  };
  provider.set = function(key, value) {
    window.localStorage[key] = value;
  };
  provider.$get = function() {
    return provider;
  };
})

.provider('Mopidy', function() {
  var provider = this;
  provider.settings = {};
  provider.isWebExtension = function() {
    var scripts = window.document.scripts;
    for (var i = 0; i != scripts.length; ++i) {
      if (/\/mopidy\/mopidy\.(min\.)?js$/.test(scripts[i].src || '')) {
        return true;
      }
    }
    return false;
  };
  provider.$get = function($q, $log) {
    if (!provider.settings.webSocketUrl && !provider.isWebExtension()) {
      // TODO: handle via settings
      provider.settings.webSocketUrl = window.prompt(
        'Mopidy WebSocket URL',
        'ws://localhost:6680/mopidy/ws/'
      );
    }
    provider.settings.autoConnect = false;
    var mopidy = new Mopidy(provider.settings);
    mopidy.on($log.log.bind($log));
    return $q(function(resolve/*, reject*/) {
      mopidy.on('state:online', function() {
        resolve(mopidy);
      });
      mopidy.connect();
    });
  };
});
