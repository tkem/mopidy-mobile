;(function(module) {
  'use strict';

  /* @ngInject */
  module.service('paging', function($q) {

      function paging(fn, args, limit) {
          var deferred = $q.defer();
          var promise = deferred.promise;

          (function iterate(args, offset, limit) {
              if (promise._cancelled) {
                  deferred.reject();
              } else if (offset >= args.length) {
                  deferred.resolve();
              } else {
                  var result = fn(args.slice(offset, offset + limit));
                  $q.when(result).then(function(value) {
                      deferred.notify(value);
                      iterate(args, offset + limit, limit);
                  }).catch(function(error) {
                      deferred.reject(error);
                  });
              }
          })(args, 0, limit);

          return promise;
      }

      paging.cancel = function(promise) {
          promise._cancelled = true;
      };

      return paging;
  });

})(angular.module('app.services.paging', []));
