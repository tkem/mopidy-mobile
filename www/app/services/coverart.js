;(function(module) {
  'use strict';

  /* @ngInject */
  module.service('imageResolver', function($q) {
    return function(uri) {
      return $q(function(resolve, reject) {
        var img = new Image();
        img.onabort = img.onerror = function(error) {
          img.onload = img.onabort = img.onerror = null;
          reject(error);
        };
        img.onload = function() {
          img.onload = img.onabort = img.onerror = null;
          resolve({uri: uri, width: img.width, height: img.height});
        };
        img.src = uri;
      });
    };
  });

  /* @ngInject */
  module.service('coverart.archive', function($q, imageResolver) {
    var baseURI = 'http://coverartarchive.org/release/';

    var mapping = {
      'Album': function(album) {
        return album.musicbrainz_id;
      },
      'Artist': function(/*artist*/) {
        return undefined;
      },
      'Track': function(track) {
        return track.album ? track.album.musicbrainz_id : undefined;
      },
      'Ref': function(/*ref*/) {
        return undefined;
      }
    };

    function getImages(mbid) {
      return imageResolver(baseURI + mbid + '/front').then(function(image) {
        return [
          image,
          {uri: baseURI + mbid + '/front-250', width: 250, height: 250},
          {uri: baseURI + mbid + '/front-500', width: 500, height: 500},
        ];
      }).catch(function() {
        return [];
      });
    }

    return function(models) {
      var images = {};
      var promises = {};
      angular.forEach(models, function(model) {
        var mbid = mapping[model.__model__](model);
        if (mbid) {
          if (mbid in promises) {
            images[model.uri] = promises[mbid];
          } else {
            images[model.uri] = promises[mbid] = getImages(mbid);
          }
        }
      });
      return $q.all(images);
    };
  });

  /* @ngInject */
  module.service('coverart.lastfm', function($http, $q) {
    var sizes = {
      small: 34,
      medium: 64,
      large: 126,
      extralarge: 252,
      mega: undefined
    };

    var mapping = {
      'Album': function(album) {
        if (album.musicbrainz_id) {
          return {method: 'album.getInfo', mbid: album.musicbrainz_id};
        } else if (album.name && album.artists && album.artists.length) {
          return {method: 'album.getInfo', album: album.name, artist: album.artists[0].name};
        } else {
          return null;
        }
      },
      'Artist': function(artist) {
        if (artist.musicbrainz_id) {
          return {method: 'artist.getInfo', mbid: artist.musicbrainz_id};
        } else if (artist.name) {
          return {method: 'artist.getInfo', artist: artist.name};
        } else {
          return null;
        }
      },
      'Track': function(track) {
        var album = track.album;
        if (album && album.musicbrainz_id) {
          return {method: 'album.getInfo', mbid: track.album.musicbrainz_id};
        } else if (album && album.name && album.artists && album.artists.length) {
          return {method: 'album.getInfo', album: album.name, artist: album.artists[0].name};
        } else if (album && album.name && track.artists && track.artists.length) {
          return {method: 'album.getInfo', album: album.name, artist: track.artists[0].name};
        } else if (track.musicbrainz_id) {
          return {method: 'track.getInfo', mbid: track.musicbrainz_id};
        } else if (track.name && track.artists && track.artists.length) {
          return {method: 'track.getInfo', track: track.name, artist: track.artists[0].name};
        } else {
          return null;
        }
      },
      'Ref': function(/*ref*/) {
        return null;
      }
    };

    function createImage(image) {
      return {
        uri: image['#text'],
        width: sizes[image.size],
        height: sizes[image.size]
      };
    }

    function getImages(params) {
      var config = {params: angular.extend(params, {
        format: 'json',
        callback: 'JSON_CALLBACK',
        api_key: 'fd01fd0378426f85397626d5f8bcc692'
      })};
      return $http.jsonp('http://ws.audioscrobbler.com/2.0/', config).then(function(result) {
        var data = result.data;
        if (data.album && data.album.image) {
          return data.album.image.map(createImage);
        } else if (data.artist && data.artist.image) {
          return data.artist.image.map(createImage);
        } else if (data.track && data.track.image) {
          return data.track.image.map(createImage);
        } else if (data.track && data.track.album && data.track.album.image) {
          return data.track.album.image.map(createImage);
        } else {
          return [];
        }
      });
    }

    return function(models) {
      var images = {};
      var promises = {};
      angular.forEach(models, function(model) {
        var params = mapping[model.__model__](model);
        if (params) {
          var key = angular.toJson(params);
          if (key in promises) {
            images[model.uri] = promises[key];
          } else {
            images[model.uri] = promises[key] = getImages(params);
          }
        }
      });
      return $q.all(images);
    };
  });

  /* @ngInject */
  module.service('coverart.mopidy', function($q, connection, imageResolver) {
    // TODO: move to connection?
    function resolveURI(uri) {
      return connection.settings().then(function(settings) {
        if (settings.webSocketUrl && uri.charAt(0) == '/') {
          var match = /^wss?:\/\/([^\/]+)/.exec(settings.webSocketUrl);
          return 'http://' + match[1] + uri;
        } else {
          return uri;
        }
      });
    }

    return function(models) {
      return connection().then(function(mopidy) {
        return mopidy.library.getImages({
          uris: models.map(function(model) {
            return model.uri;
          })
        });
      }).then(function(result) {
        // TODO: move resolving into coverart service?
        var promises = {};
        angular.forEach(result, function(images, uri) {
          if (!images || !images.length) {
            // $log.debug('Mopidy found no images for ' + uri);
          } else if (images.length === 1) {
            // common case: single image, no need for width/height
            promises[uri] = resolveURI(images[0].uri).then(function(uri) {
              images[0].uri = uri;
              return images;
            });
          } else {
            // most backends won't provide image dimensions anytime soon
            promises[uri] = $q.all(images.map(function(image) {
              return resolveURI(image.uri).then(function(uri) {
                image.uri = uri;
                if (!image.width || !image.height) {
                  return imageResolver(image.uri);
                } else {
                  return image;
                }
              });
            }));
          }
        });
        return $q.all(promises);
      });
    };
  });

  /* @ngInject */
  module.provider('coverart', function() {
    function merge(dst, results) {
      for (var i = 0, reslen = results.length; i !== reslen; ++i) {
        var result = results[i];
        var keys = Object.keys(result);
        for (var j = 0, keylen = keys.length; j !== keylen; ++j) {
          var key = keys[j];
          // FIXME: stable sort really needed here?
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

      return {
        clearCache: function() {
          cache.removeAll();
        },
        // TODO: merge geImage(s) methods?
        getImage: function(model, options) {
          var width = options ? options.width : undefined;
          var height = options ? options.height : undefined;
          var images = cache.get(model.uri);
          if (images) {
            $log.debug('cache(' + cache.info().size + ') hit for ' + model.uri, images);
            return $q.when(select(images, width, height));
          } else {
            $log.debug('cache(' + cache.info().size + ') miss for ' + model.uri);
            return $q.all(services.map(function(service) {
              return service([model]).catch(function(error) {
                $log.error('Error loading cover art', error);
                return {};
              });
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
          return $q.all(services.map(function(service) {
            return service(models).catch(function(error) {
              $log.error('Error loading cover art', error);
              return {};
            });
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
            return cached;
          });
        },
        services: function(names) {
          services = [];
          names.forEach(function(name) {
            try {
              services.push($injector.get('coverart.' + name));
            } catch (e) {
              $log.error('Invalid coverart service ' + name + ': ' + e);
            }
          });
        }
      };
    };
  });

})(angular.module('app.services.coverart', ['app.services.connection']));
