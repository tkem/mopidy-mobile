angular.module('mopidy-mobile.storage', [
  'LocalStorageModule'
])

.config(function(localStorageServiceProvider) {
  localStorageServiceProvider.setNotify(true, true);
})

.provider('storage', function(localStorageServiceProvider) {
  var bindings = {};  // TODO: multiple bindings for same key
  var defaults = {};
  var prefix = null;
  return angular.extend(this, {
    $get: function($log, $parse, $rootScope, localStorageService) {
      $rootScope.$on('LocalStorageModule.notification.removeitem', function(event, args) {
        if (args.key in bindings) {
          bindings[args.key](defaults[args.key]);
        }
      });
      // $rootScope.$on('LocalStorageModule.notification.setitem', function(event, args) {
      //   if (args.key in bindings) {
      ///    bindings[args.key](args.newvalue);
      //   }
      // });
      return {
        bind: function(scope, property, key) {
          key = key || property;
          var value = angular.copy(defaults[key]);
          var unbind = localStorageService.bind(scope, property, value, key);
          bindings[key] = function(value) {
            $parse(property).assign(scope, angular.copy(value));
          };
          return function() {
            delete bindings[key];
            unbind();
          };
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
