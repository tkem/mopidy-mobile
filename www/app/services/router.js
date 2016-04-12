;(function(module) {
  'use strict';

  var resolveCache = null;

  function wrapResolveFunction(state, key, fn) {
    /* @ngInject */
    return function($injector, $log, $q, $state, $stateParams) {
      var href = $state.href(state, $stateParams);
      var cache = resolveCache ? resolveCache.get(href) || resolveCache.put(href, {}) : null;
      if (cache && key in cache) {
        $log.debug('Resolve cache hit: ' + state + '.' + key + ' [' + href + ']');
        return cache[key];
      } else if (cache) {
        $log.debug('Resolve cache miss: ' + state + '.' + key + ' [' + href + ']');
        var resolve = $injector.invoke(fn, null, angular.extend(
          {}, {'$stateParams': $stateParams, params: $stateParams}, $stateParams
        ));
        $q.when(resolve).then(function() { cache[key] = resolve; });
        return resolve;
      } else {
        return $injector.invoke(fn, null, angular.extend(
          {}, {'$stateParams': $stateParams, params: $stateParams}, $stateParams
        ));
      }
    };
  }

  function wrapResolve(state, resolve) {
    var wrapper = {};
    angular.forEach(resolve, function(value, key) {
      wrapper[key] = angular.isFunction(value) ? wrapResolveFunction(state, key, value) : value;
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
  module.config(function($locationProvider) {
    $locationProvider.html5Mode(false);  // TODO: browser reload?
  });

  /* @ngInject */
  module.provider('router', function RouterProvider($ionicConfigProvider, $stateProvider, $urlRouterProvider) {
    var provider = this;

    provider.fallbackUrl = function(url) {
      $urlRouterProvider.otherwise(url);
    };

    provider.maxCache = function(value) {
      if (arguments.length) {
        return $ionicConfigProvider.views.maxCache(value);
      } else {
        return $ionicConfigProvider.views.maxCache();
      }
    };

    provider.forwardCache = function(value) {
      if (arguments.length) {
        return $ionicConfigProvider.views.forwardCache(value);
      } else {
        return $ionicConfigProvider.views.forwardCache();
      }
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
    provider.$get = function($cacheFactory, $ionicConfig, $ionicHistory, $log, $state) {
      var maxCache = $ionicConfig.views.maxCache();
      if (maxCache) {
        $log.debug('Creating resolve cache with capacity ' + maxCache);
        resolveCache = $cacheFactory('resolves', {capacity: maxCache});
      }

      return {
        clearCache: function() {
          if (resolveCache) {
            resolveCache.removeAll();
          }
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
        },
        reload: function() {
          return $state.go($state.current, {}, {reload: true});
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
