;(function(module) {
  'use strict';

  function remove(obj, value) {
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
  }

  module.factory('popoverMenu', function($filter, $log, $ionicPopover, $rootScope) {
    var popoverMenus = [];
    $rootScope.$on('$translateChangeSuccess', function() {
      angular.forEach(popoverMenus, function(popoverMenu) {
        popoverMenu.refresh();
      });
    });

    return function(items, options) {
      function createPopover() {
        var template = [];
        var translate = $filter('translate');  // filter is synchronous
        template.push('<ion-popover-view class="mopidy-mobile-menu">');
        template.push('<ion-content scroll="false">');  // TODO: options
        template.push('<ion-list>');
        angular.forEach(items, function(item) {
          if (item.model) {
            template.push('<ion-checkbox ng-model="' + item.model + '"');
          } else {
            template.push('<button class="item"');
          }
          if (item.change) {
            template.push(' ng-change="' + item.change + '"');
          }
          if (item.click) {
            template.push(' ng-click="' + item.click + '"');
          }
          if (item.disabled) {
            template.push(' ng-disabled="' + item.disabled + '"');
          }
          if (item.hidden) {
            template.push(' ng-hide="' + item.hidden + '"');
          }
          template.push('>');
          template.push(translate(item.text));
          if (item.hellip) {
            template.push('&hellip;');
          }
          template.push(item.model ? '</ion-checkbox>' : '</button>');
        });
        template.push('</ion-list>');
        template.push('</ion-content>');
        template.push('</ion-popover-view>');
        return $ionicPopover.fromTemplate(template.join(''), options);
      }
      var popover = createPopover();
      var popoverMenu = {
        show: function($event) {
          return popover.show($event);
        },
        hide: function() {
          return popover.hide();
        },
        remove: function() {
          if (popover) {
            remove(popoverMenus, this);
            var promise = popover.remove();
            popover = null;
            return promise;
          } else {
            $log.error('Trying to remove destroyed popover');
          }
        },
        isShown: function() {
          return popover.isShown();
        },
        refresh: function() {
          if (popover) {
            return popover.remove().finally(function() {
              popover = createPopover();
            });
          } else {
            $log.error('Trying to refresh destroyed popover');
          }
        }
      };
      if (options.scope) {
        options.scope.$on('$destroy', function() {
          popoverMenu.remove();
        });
      }
      popoverMenus.push(popoverMenu);
      return popoverMenu;
    };
  });

})(angular.module('app.ui.menu', ['ionic', 'pascalprecht.translate']));
