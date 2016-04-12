;(function(module) {
  'use strict';

  /* @ngInject */
  module.provider('loading', function() {
    var provider = this;

    var options = {
      delay: 100
    };

    /* @ngInject */
    provider.$get = function($ionicLoading, $log, $timeout) {
      var count = 0;

      return {
        show: function() {
          if (count++ === 0) {
            $ionicLoading.show(options);
          }
        },

        hide: function() {
          if (--count === 0) {
            if (options.delay) {
              // see http://forum.ionicframework.com/t/ionicloading-bug/8001
              $timeout(function() {
                var body = angular.element(document.body);
                if (!count && body.hasClass('loading-active')) {
                  $log.debug('Loading overlay still active when hidden!');
                  $ionicLoading.hide();
                }
              }, options.delay);
            }
            $ionicLoading.hide();
          }
        }
      };
    };
  });

})(angular.module('app.ui.loading', ['ionic']));
