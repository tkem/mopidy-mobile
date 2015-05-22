angular.module('mopidy-mobile.storage', [
  'LocalStorageModule'
])

.config(function(localStorageServiceProvider) {
  localStorageServiceProvider.setNotify(true, true);
})

.provider('storage', function(localStorageServiceProvider) {
  var defaults = {};
  var prefix = null;
  return angular.extend(this, {
    $get: function($log, localStorageService) {
      return {
        bind: function(scope, property, key) {
          var value = angular.copy(defaults[key || property]);
          return localStorageService.bind(scope, property, value, key);
        },
        clear: function() {
          localStorageService.clearAll();
        },
        get: function(key) {
          if (localStorageService.keys().indexOf(key) >= 0) {
            return localStorageService.get(key);
          } else {
            return angular.copy(defaults[key]);
          }
        },
        set: function(key, value) {
          localStorageService.set(key, angular.copy(value));
        }
      };
    },
    defaults: function(obj) {
      if (arguments.length) {
        angular.extend(defaults, obj);
      } else {
        return angular.copy(defaults);
      }
    },
    prefix: function(value) {
      if (arguments.length) {
        localStorageServiceProvider.setPrefix(prefix = value);
      } else {
        return prefix;
      }
    }
  });
});
