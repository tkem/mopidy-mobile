;(function(module) {
  'use strict';

  function fromKeys(keys, value) {
    var obj = {};
    for (var i = keys.length - 1; i >= 0; --i) {
      obj[keys[i]] = angular.isFunction(value) ? value(keys[i]) : value;
    }
    return obj;
  }

  module.provider('stylesheet', function() {
    var element = angular.element(document.getElementById('stylesheet'));
    var hrefs = fromKeys([element.attr('href').replace(/[?].*/, '')], true);
    var query = element.attr('href').replace(/^[^?]*/, '');
    var provider = angular.extend(this, {
      $get: function($log) {
        return {
          get: provider.get,
          set: function(href) {
            if (href in hrefs) {
              element.attr('href', href + query);
            } else {
              $log.error('Invalid stylesheet "' + href + '"');
            }
          }
        };
      },
      add: function(href) {
        hrefs[href] = true;
      },
      get: function() {
        return element.attr('href').replace(/[?].*/, '');
      }
    });
  });

})(angular.module('app.ui.stylesheet', []));
