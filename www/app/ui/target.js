;(function(module) {
  'use strict';

  module.directive('target', function($window) {
    return {
      restrict: 'A',
      link: function(scope, element, attr) {
        var href = attr.href;
        var target = attr.target;
        element.on('click', function() {
          $window.open(href, target);
        });
        // Hack for iOS Safari's benefit. It goes searching for onclick
        // handlers and is liable to click something else nearby.
        element.onclick = angular.noop;
      }
    };
  });

})(angular.module('app.ui.target', []));
