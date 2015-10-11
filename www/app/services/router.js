;(function(module) {
  'use strict';

  // FIXME: workarounds for cached views calling resolvers; see
  // http://forum.ionicframework.com/t/state-resolving-and-cached-views-in-beta-14/17870/

  function getByDelegateHref(elements, href) {
    for (var i = elements.length - 1; i >= 0; --i) {
      var element = elements.eq(i);
      if (element.attr('delegate-href') === href) {
        return element;
      }
    }
    return null;
  }

  function wrapResolveFunction(name, fn) {
    /* @ngInject */
    return function($injector, $ionicNavViewDelegate, $state, $stateParams) {
      var href = $state.href(name, $stateParams);
      if (!$ionicNavViewDelegate.isCached(href)) {
        return $injector.invoke(fn, null, angular.extend(
          {}, {'$stateParams': $stateParams, params: $stateParams}, $stateParams
        ));
      }
    };
  }

  function wrapResolve(name, resolve) {
    var wrapper = {};
    angular.forEach(resolve, function(factory, key) {
      wrapper[key] = angular.isFunction(factory) ? wrapResolveFunction(name, factory) : factory;
    });
    return wrapper;
  }

  function wrapStateConfig(name, config) {
    var wrapper = angular.copy(config);  // deep copy
    wrapper.resolve = wrapResolve(name, wrapper.resolve || {});
    angular.forEach(wrapper.views || {}, function(view) {
      view.resolve = wrapResolve(name, view.resolve || {});
    });
    return wrapper;
  }

  /* @ngInject */
  module.config(function($provide) {
    /* @ngInject */
    $provide.decorator('ionViewDirective', function($delegate, $state, $stateParams) {
      return $delegate.map(function(obj) {
        var compile = obj.compile;
        obj.compile = function(element, attrs) {
          var href = $state.href($state.current.name, $stateParams);
          attrs.$set('delegateHref', href);
          return compile(element, attrs);
        };
        return obj;
      });
    });

    /* @ngInject */
    $provide.decorator('$ionicNavViewDelegate', function($delegate, $log) {
      $delegate.isCached = function(href) {
        for (var i = $delegate._instances.length - 1; i >= 0; --i) {
          var elements = $delegate._instances[i].getViewElements();
          var view = getByDelegateHref(elements, href);
          if (view && view.attr('cache-view') != 'false') {
            //$log.debug('view ' + href + ' is cached');
            return true;
          }
        }
        return false;
      };
      return $delegate;
    });
  });

  /* @ngInject */
  module.config(function($locationProvider) {
    $locationProvider.html5Mode(false);  // TODO: browser reload?
  });

  /* @ngInject */
  module.provider('router', function RouterProvider($stateProvider, $urlRouterProvider) {
    var provider = this;

    provider.fallbackUrl = function(url) {
      $urlRouterProvider.otherwise(url);
    };

    provider.state = function(name, config) {
      $stateProvider.state(name, wrapStateConfig(name, config));
    };

    provider.states = function(states) {
      angular.forEach(states, function(config, name) {
        provider.state(name, config);
      });
    };

    /* @ngInject */
    provider.$get = function($ionicHistory, $state) {
      return {
        clearCache: function() {
          return $ionicHistory.clearCache();
        },
        clearHistory: function() {
          return $ionicHistory.clearHistory();
        },
        go: function(state, params) {
          return $state.go(state, params);
        },
        goBack: function() {
          $ionicHistory.nextViewOptions({disableAnimate: true});
          return $ionicHistory.goBack();
        }
      };
    };
  });

  /* @ngInject */
  module.run(function($location, $log) {
    // workaround for lost history/back view after browser reload
    if ($location.url()) {
      $log.debug('Redirecting from ' + $location.url());
      $location.url('');
      $location.replace();
    }
  });

})(angular.module('app.services.router', ['ionic']));
