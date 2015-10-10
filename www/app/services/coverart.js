;(function(module) {
  'use strict';

  function values(obj) {
    return Object.keys(obj).map(function(key) {
      return obj[key];
    });
  }

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

    var cacheOptions = {};
    var serviceProviders = {};

    angular.extend(this, {
      $get: function($cacheFactory, $injector, $log, $q) {
        var cache = $cacheFactory('images', cacheOptions);
        var services = {};

        return {
          clearCache: function() {
            cache.removeAll();
          },
          disable: function(service) {
            delete services[service];
          },
          enable: function(service) {
            if (service in serviceProviders) {
              services[service] = $injector.invoke(serviceProviders[service]);
            } else {
              $log.error('Unknown coverart service ' + service);
            }
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
              return $q.all(values(services).map(function(service) {
                return service.getImages([model]).catch(function(error) {
                  $log.error('Error loading cover art from ' + service.displayName, error);
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
            $log.debug('Loading cover art from ' + Object.keys(services));
            return $q.all(values(services).map(function(service) {
              return service.getImages(models).catch(function(error) {
                $log.error('Error loading cover art from ' + service.displayName, error);
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
          },
          useServices: function(names) {
            services = {};
            names.forEach(function(service) {
              if (service in serviceProviders) {
                services[service] = $injector.invoke(serviceProviders[service]);
              } else {
                $log.error('Unknown coverart service ' + service);
              }
            });
          }
        };
      },
      maxCache: function(value) {
        if (arguments.length) {
          cacheOptions.capacity = value;
        } else {
          return cacheOptions.capacity;
        }
      },
      service: function(id, fn) {
        serviceProviders[id] = fn;
      }
    });
  });

  module.config(function(coverartProvider) {
    coverartProvider.service('mopidy', function(connection, coverart, $log, $q) {
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

      return {
        displayName: 'Mopidy',
        getImages: function(models) {
          return connection().then(function(mopidy) {
            return mopidy.library.getImages({
              uris: models.map(function(model) {
                return model.uri;
              })
            });
          }).then(function(result) {
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
                      return coverart.resolveImage(image.uri);
                    } else {
                      return image;
                    }
                  });
                }));
              }
            });
            return $q.all(promises);
          });
        }
      };
    });
  });

  module.config(function(coverartProvider) {
    coverartProvider.service('archive', function($q, coverart) {
      function createImages(mbid) {
        // use smallest thumbnail to check for existence
        return coverart.resolveImage(baseURI + mbid + '/front-250').then(function() {
          return [
            {uri: baseURI + mbid + '/front'},
            {uri: baseURI + mbid + '/front-250', width: 250, height: 250},
            {uri: baseURI + mbid + '/front-500', width: 500, height: 500},
          ];
        }).catch(function() {
          return [];
        });
      }

      var baseURI = 'http://coverartarchive.org/release/';

      var mapping = {
        'Album': function(album) {
          if (album.musicbrainz_id) {
            return createImages(album.musicbrainz_id);
          } else {
            return [];
          }
        },
        'Artist': function(/*artist*/) {
          return [];
        },
        'Track': function(track) {
          if (track.album && track.album.musicbrainz_id) {
            return createImages(track.album.musicbrainz_id);
          } else {
            return [];
          }
        },
      };

      return {
        displayName: 'Cover Art Archive',
        getImages: function(models) {
          // TODO: order/map by album if present to save bandwidth?
          var promises = {};
          angular.forEach(models, function(model) {
            promises[model.uri] = mapping[model.__model__](model);
          });
          return $q.all(promises);
        }
      };
    });
  });

  module.config(function(coverartProvider) {
    coverartProvider.service('lastfm', function($q, $http) {
      function createImage(image) {
        return {
          uri: image['#text'],
          width: sizes[image.size],
          height: sizes[image.size]
        };
      }

      var url = 'http://ws.audioscrobbler.com/2.0/';
      var params = {
        format: 'json',
        callback: 'JSON_CALLBACK',
        api_key: 'fd01fd0378426f85397626d5f8bcc692'
      };
      var sizes = {
        small: 34,
        medium: 64,
        large: 126,
        extralarge: 252,
        mega: undefined
      };
      var mapping = {
        'Album': function(album) {
          var config = {params: angular.extend({method: 'album.getInfo'}, params)};
          if (album.musicbrainz_id) {
            angular.extend(config.params, {mbid: album.musicbrainz_id});
          } else if (album.name && album.artists && album.artists.length) {
            angular.extend(config.params, {album: album.name, artist: album.artists[0].name});
          } else {
            return $q.when([]);
          }
          return $http.jsonp(url, config).then(function(result) {
            var album = result.data.album;
            if (album && album.image) {
              return album.image.map(createImage);
            } else {
              return [];
            }
          });
        },
        'Artist': function(artist) {
          var config = {params: angular.extend({method: 'artist.getInfo'}, params)};
          if (artist.musicbrainz_id) {
            angular.extend(config.params, {mbid: artist.musicbrainz_id});
          } else if (artist.name) {
            angular.extend(config.params, {artist: artist.name});
          } else {
            return $q.when([]);
          }
          return $http.jsonp(url, config).then(function(result) {
            var artist = result.data.artist;
            if (artist && artist.image) {
              return artist.image.map(createImage);
            } else {
              return [];
            }
          });
        },
        'Track': function(track) {
          var config = {params: angular.extend({method: 'track.getInfo'}, params)};
          if (track.musicbrainz_id) {
            angular.extend(config.params, {mbid: track.musicbrainz_id});
          } else if (track.name && track.artists && track.artists.length) {
            angular.extend(config.params, {track: track.name, artist: track.artists[0].name});
          } else {
            return $q.when([]);
          }
          return $http.jsonp(url, config).then(function(result) {
            var track = result.data.track;
            if (track && track.image) {
              return track.image.map(createImage);
            } else if (track && track.album && track.album.image) {
              return track.album.image.map(createImage);
            } else {
              return [];
            }
          });
        },
      };

      return {
        displayName: 'last.fm',
        getImages: function(models) {
          // TODO: order/map by album if present to save bandwidth?
          var promises = {};
          angular.forEach(models, function(model) {
            promises[model.uri] = mapping[model.__model__](model);
          });
          return $q.all(promises);
        }
      };
    });
  });

})(angular.module('app.services.coverart', ['app.services.connection']));
