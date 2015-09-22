;(function(module) {
  'use strict';

  module.provider('stylesheet', function(util) {
    var element = angular.element(document.getElementById('stylesheet'));
    var hrefs = util.fromKeys([element.attr('href').replace(/[?].*/, '')], true);
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

})(angular.module('app.ui.stylesheet', ['app.services.util', 'ionic']));
