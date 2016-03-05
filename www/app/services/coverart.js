;(function(module) {
  'use strict';

  function imageCompare(a, b) {
    return (a.width || Infinity) - (b.width || Infinity) ||
      (a.height || Infinity) - (b.height || Infinity);
  }

  function mergeResults(results) {
    var obj = {};
    results.forEach(function(result) {
      Object.keys(result).forEach(function(key) {
        obj[key] = (obj[key] || []).concat(result[key]);
      });
    });
    // sort according to image size
    angular.forEach(obj, function(images) {
      images.sort(imageCompare);
    });
    return obj;
  }

  function findImage(images, width, height) {
    if (!images || !images.length) {
      return null;
    }
    for (var i = 0, length = images.length; i !== length; ++i) {
      var image = images[i];
      if (image.width === undefined || image.height === undefined) {
        return image;
      } else if (image.width >= width && image.height >= height) {
        return image;
      }
    }
    return images[images.length - 1];
  }

  /* @ngInject */
  module.provider('coverart', function() {

    var provider = this;
    var cacheOptions = {};

    provider.maxCache = function(value) {
      if (arguments.length) {
        cacheOptions.capacity = value;
      } else {
        return cacheOptions.capacity;
      }
    };

    /* @ngInject */
    provider.$get = function($cacheFactory, $injector, $log, $q) {
      var cache = $cacheFactory('images', cacheOptions);
      var services = [];
      var coverart = {};

      coverart.clearCache = function() {
        cache.removeAll();
      };

      coverart.getImages = function(models, options) {
        var width = options ? options.width : undefined;
        var height = options ? options.height : undefined;
        var result = {};
        var params = [];

        models.forEach(function(model) {
          var images = cache.get(model.uri);
          if (images) {
            result[model.uri] = findImage(images, width, height);
          } else {
            params.push(model);
          }
        });

        if (params.length) {
            return $q.all(services.map(function(service) {
                return service(params).catch(function(error) {
                    $log.error('Error loading cover art', error);
                    return {};
                });
            })).then(function(results) {
                angular.forEach(mergeResults(results), function(images, uri) {
                    result[uri] = findImage(cache.put(uri, images || []), width, height);
                });
                return result;
            });
        } else {
            return $q.when(result);
        }
      };

      coverart.getImage = function(model, options) {
        return coverart.getImages([model], options).then(function(result) {
          return result[model.uri];
        });
      };

      coverart.use = function(names) {
        services = [];
        names.forEach(function(name) {
          try {
            services.push($injector.get('coverart.' + name));
          } catch (e) {
            $log.error('Invalid coverart service ' + name + ': ' + e);
          }
        });
      };

      return coverart;
    };
  });

})(angular.module('app.services.coverart', []));
