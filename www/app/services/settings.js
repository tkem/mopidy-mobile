;(function(module) {
  'use strict';

  var key = null;

  /* @ngInject */
  module.provider('settings', function SettingsProvider() {
    this.key = function(value) {
      if (angular.isDefined(value)) {
        key = value;
        return this;
      } else {
        return key;
      }
    };

    /* @ngInject */
    this.$get = function($rootElement, $window) {
      var storage = $window.localStorage;

      if (!angular.isString(key)) {
        key = $rootElement.attr('ng-app');
      }

      return {
        get: function(defaults) {
          var obj = angular.fromJson(storage[key] || '{}');
          return angular.extend({}, defaults || {}, obj);
        },
        set: function(src) {
          storage[key] = angular.toJson(src);
        },
        extend: function(src) {
          var obj = angular.extend(angular.fromJson(storage[key] || '{}'), src);
          storage[key] = angular.toJson(obj);
          return obj;
        },
        merge: function(src) {
          var obj = angular.merge(angular.fromJson(storage[key] || '{}'), src);
          storage[key] = angular.toJson(obj);
          return obj;
        },
        clear: function() {
          delete storage[key];
        }
      };
    };
  });

})(angular.module('app.services.settings', []));
