angular.module('mopidy-mobile.coverart.mopidy', [
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
]).config(function(coverartProvider) {
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
