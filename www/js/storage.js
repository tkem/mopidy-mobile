angular.module('mopidy-mobile.storage', [
  'LocalStorageModule'
])

.provider('storage', function(localStorageServiceProvider) {
  function unquote(s) {
    if (angular.isString(s) && s[0] === '"' && s[s.length - 1] === '"') {
      return s.slice(1, s.length - 1);
    } else {
      return s;
    }
  }
  localStorageServiceProvider.setPrefix('mopidy-mobile');
  return angular.extend(this, {
    $get: function(localStorageService) {
      return {
        clear: function() {
          localStorageService.clearAll();
        },
        get: function(key, defaultValue) {
          if (localStorageService.keys().indexOf(key) >= 0) {
            return unquote(localStorageService.get(key));
          } else {
            return defaultValue;
          }
        },
        set: function(key, value) {
          localStorageService.set(key, value);
        }
      };
    },
    // FIXME: remove
    get: function(key, defaultValue) {
      key = 'mopidy-mobile.' + key;
      if (key in window.localStorage) {
        try {
          return angular.fromJson(window.localStorage[key]);
        } catch (e) {
          return window.localStorage[key];
        }
      } else {
        return defaultValue;
      }
    },
    has: function(key) {
      return 'mopidy-mobile.' + key in window.localStorage;
    }

  });
});
