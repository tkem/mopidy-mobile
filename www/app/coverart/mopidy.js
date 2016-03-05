;(function(module) {
  'use strict';

  /* @ngInject */
  module.service('coverart.mopidy', function($q, connection) {
    return function(models) {
      return connection.settings().then(function(settings) {
        // resolve absolute path URIs as returned by mopidy-local-images
        var resolve = settings.webSocketUrl ? function(image) {
          if (image.uri.charAt(0) == '/') {
            var match = /^wss?:\/\/([^\/]+)/.exec(settings.webSocketUrl);
            return angular.extend({uri: 'http://' + match[1] + image.uri});
          } else {
            return image;
          }
        } : angular.identity;

        return connection().then(function(mopidy) {
          return mopidy.library.getImages({
            uris: models.map(function(model) {
              return model.uri;
            })
          });
        }).then(function(result) {
          return angular.forEach(result, function(images, uri, obj) {
            obj[uri] = images ? images.map(resolve) : images;
          });
        });
      });
    };
  });

})(angular.module('app.coverart.mopidy', ['app.services.connection']));
