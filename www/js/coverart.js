angular.module('mopidy-mobile.coverart', [])

.provider('coverart', function() {
  var provider = this;
  var services = [];
  var cacheOptions = {};

  angular.extend(provider, {
    enable: function(service) {
      var index = services.indexOf(service);
      if (index < 0) {
        services.push(service);
      }
    },
    maxCache: function(value) {
      if (arguments.length) {
        cacheOptions.capacity = value;
        return provider;
      } else {
        return cacheOptions.capacity;
      }
    }
  });

  provider.$get = function($cacheFactory, $injector, $q, $log) {
    function merge(dst, results) {
      for (var i = 0, reslen = results.length; i !== reslen; ++i) {
        var result = results[i];
        var keys = Object.keys(result);
        for (var j = 0, keylen = keys.length; j !== keylen; ++j) {
          var key = keys[j];
          // stable sort by size, images w/o size come last
          dst[key] = (dst[key] || []).concat(result[key]).map(function(image, index) {
            return {image: image, index: index};
          }).sort(function(a, b) {
            return (a.image.width || Infinity) - (b.image.width || Infinity) ||
              (a.image.height || Infinity) - (b.image.height || Infinity) ||
              a.index - b.index;
          }).map(function(obj) {
            return obj.image;
          });
        }
      }
      return dst;
    }

    function select(images, width, height) {
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

    var cache = $cacheFactory('images', cacheOptions);

    return angular.extend(provider, {
      disable: function(service) {
        var index = services.indexOf(service);
        if (index >= 0) {
          services.splice(index, 1);
        }
      },
      maxCache: function(value) {
        if (arguments.length) {
          if (value !== cache.info().capacity) {
            cache.destroy();
            cache = $cacheFactory('images', {capacity: value});
          }
          return provider;
        } else {
          return cache.info().capacity;
        }
      },
      clearCache: function() {
        cache.removeAll();
      },
      getImage: function(model, options) {
        var width = options ? options.width : undefined;
        var height = options ? options.height : undefined;
        var images = cache.get(model.uri);
        if (images) {
          $log.debug('cache(' + cache.info().size + ') hit for ' + model.uri, images);
          return $q.when(select(images, width, height));
        } else {
          $log.debug('cache(' + cache.info().size + ') miss for ' + model.uri);
          return $q.all(services.map($injector.get).map(function(service) {
            return service.getImages([model]);
          })).then(function(results) {
            return merge({}, results);
          }).then(function(result) {
            var images = result[model.uri];
            if (images) {
              return select(cache.put(model.uri, images), width, height);
            } else {
              return null;
            }
          });
        }
      },
      getImages: function(models, options) {
        var width = options ? options.width : undefined;
        var height = options ? options.height : undefined;
        var cached = {};
        models = models.filter(function(model) {
          var images = cache.get(model.uri);
          if (images) {
            cached[model.uri] = images;
            return false;
          } else {
            return true;
          }
        });
        $log.debug('Loading cover art from ' + services);
        return $q.all(services.map($injector.get).map(function(service) {
          return service.getImages(models);
        })).then(function(results) {
          return merge({}, results);
        }).then(function(result) {
          angular.forEach(result, function(images, uri) {
            if (images) {
              cached[uri] = cache.put(uri, images);
            }
          });
          angular.forEach(cached, function(images, uri) {
            cached[uri] = select(images, width, height);
          });
          $log.debug('Loading cover art done');
          return cached;
        });
      },
      resolveImage: function(uri) {
        return $q(function(resolve, reject) {
          var img = new Image();
          img.onabort = img.onerror = function(error) {
            img.onload = img.onabort = img.onerror = null;
            reject(error);
          };
          img.onload = function() {
            img.onload = img.onabort = img.onerror = null;
            resolve({__model__: 'Image', uri: uri, width: img.width, height: img.height});
          };
          img.src = uri;
        });
      }
    });
  };
});
