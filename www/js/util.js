angular.module('mopidy-mobile.util', [])

.constant('util', {
  contains: function(obj, value) {
    if (Array.isArray(obj)) {
      return obj.indexOf(value) >= 0;
    } else {
      for (var name in obj) {
        if (obj[name] === value) {
          return true;
        }
      }
      return false;
    }
  },

  remove: function(obj, value) {
    if (Array.isArray(obj)) {
      for (var i = obj.indexOf(value); i >= 0; i = obj.indexOf(value, i)) {
        obj.splice(i, 1);
      }
    } else {
      for (var name in obj) {
        if (obj[name] === value) {
          delete obj[name];
        }
      }
    }
    return obj;
  },

  values: function(obj) {
    var values = [];
    angular.forEach(obj, function(value) {
      values.push(value);
    });
    return values;
  },

  zipObject: function(keys, values) {
    var obj = {};
    for (var i = 0, length = keys.length; i !== length; ++i) {
      obj[keys[i]] = values[i];
    }
    return obj;
  },

  fromKeys: function(keys, value) {
    var obj = {};
    for (var i = keys.length - 1; i >= 0; --i) {
      obj[keys[i]] = angular.isFunction(value) ? value(keys[i]) : value;
    }
    return obj;
  },

  getLanguages: function() {
    var navigator = window.navigator;
    var properties = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'];
    // support for HTML 5.1 "navigator.languages"
    if (angular.isArray(navigator.languages) && navigator.languages.length) {
      return navigator.languages;
    }
    // support for other well known properties in browsers
    for (var i = 0; i !== properties.length; ++i) {
      var language = navigator[properties[i]];
      if (language && language.length) {
        return [language];
      }
    }
    return [];
  },

  parseURI: function(uri) {
    var m = /^(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:\#(.*))?/.exec(uri);
    if (m[2]) {
      Array.prototype.push.apply(m, /^(?:(.*)@)?(.*?)(?::(\d*))?$/.exec(m[2]));
    }
    return {
      scheme: m[1],
      authority: m[2],
      path: m[3],
      query: m[4],
      fragment: m[5],
      userinfo: m[7],
      host: m[8],
      port: m[9]
    };
  }
});
