angular.module('mopidy-mobile.ui', [
  'ionic',
  'pascalprecht.translate'
])

.directive('target', function($window) {
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
})

.factory('popoverMenu', function(util, $filter, $log, $ionicPopover, $rootScope) {
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
          util.remove(popoverMenus, this);
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
})

.factory('popup', function($filter, $rootScope, $ionicPopup) {
  var translate = $filter('translate');  // filter is synchronous

  return {
    alert: function(message) {
      return $ionicPopup.alert({
        title: translate(message),
        okText: translate('OK')
      });
    },
    confirm: function(message) {
      return $ionicPopup.confirm({
        title: translate(message),
        okText: translate('OK'),
        cancelText: translate('Cancel')
      });
    },
    prompt: function(text, placeholder) {
      return $ionicPopup.prompt({
        title: translate(text),
        inputPlaceholder: placeholder,
        okText: translate('OK'),
        cancelText: translate('Cancel')
      });
    },
    fromTemplateUrl: function(title, templateUrl) {
      var scope = $rootScope.$new(true);
      scope.data = {};
      return $ionicPopup.show({
        templateUrl: templateUrl,
        title: translate(title),
        scope: scope,
        buttons: [
          { text: translate('Cancel') },
          {
            text: translate('OK'),
            type: 'button-positive',
            onTap: function() {
              return scope.data;
            }
          }
        ]
      });
    }
  };
})

.provider('stylesheet', function(util) {
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
})
;
