;(function(module) {
  'use strict';

  var popovers = {};
  var nextId = 0;

  module.factory('popover', function($ionicPopover, $log, $rootScope) {
    function fromTemplate(template, options) {
      var id = ++nextId;
      $log.debug('creating popover #' + id);
      var popover = $ionicPopover.fromTemplate(template, options);
      var wrapper = popovers[id] = {
        id: id,
        show: function($event) {
          return popover.show($event);
        },
        hide: function() {
          return popover.hide();
        },
        refresh: function() {
          return popover.remove().finally(function() {
            popover = $ionicPopover.fromTemplate(template, options);
          });
        }
      };
      (options.scope || $rootScope).$on('$destroy', function() {
        $log.debug('removing popover #' + id);
        delete popovers[id];
        popover.remove();
      });
      return wrapper;
    }

    function fromTemplateUrl(url, options) {
      var id = ++nextId;
      $log.debug('creating popover #' + id);
      var promise = $ionicPopover.fromTemplateUrl(url, options);
      var wrapper = popovers[id] = {
        id: id,
        show: function($event) {
          return promise.then(function(popover) {
            return popover.show($event);
          });
        },
        hide: function() {
          return promise.then(function(popover) {
            return popover.hide();
          });
        },
        refresh: function() {
          return promise.then(function(popover) {
            return popover.remove().finally(function() {
              promise = $ionicPopover.fromTemplateUrl(url, options);
            });
          });
        }
      };
      (options.scope || $rootScope).$on('$destroy', function() {
        promise.then(function(popover) {
          $log.debug('removing popover #' + id);
          delete popovers[id];
          popover.remove();
        });
      });
      return wrapper;
    }

    $rootScope.$on('$translateChangeSuccess', function() {
      angular.forEach(popovers, function(popover, id) {
        $log.debug('refreshing popover #' + id);
        popover.refresh();
      });
    });

    return {
      fromTemplate: fromTemplate,
      fromTemplateUrl: fromTemplateUrl,
      getById: function(id) { return popovers[id]; }
    };
  });

})(angular.module('app.ui.popover', ['ionic']));
