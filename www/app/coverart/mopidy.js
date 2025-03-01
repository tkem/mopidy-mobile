;(function(module) {
  'use strict';

  // workaround for https://github.com/mopidy/mopidy/issues/1486
  function isNotStream(uri) {
    var scheme = uri.split(':', 2)[0];
    // case in point for model "source" attribute?
    return ['file', 'http', 'https', 'mms', 'rtmp', 'rtmps', 'rtsp'].indexOf(scheme) == -1;
  }

  /* @ngInject */
  module.service('coverart.mopidy', function($q, connection) {
    return function(models) {
      var uris = models.map(function(model) { return model.uri; }).filter(isNotStream);

      if (!uris.length) {
        return $q.when({});
      }

      // resolve absolute path URIs as returned by mopidy-local-images
      // FIXME: not necessary hosted environments?
      var settings = connection.settings();
      var resolve = settings.webSocketUrl ? function(image) {
        if (image.uri.charAt(0) == '/') {
          var url = new URL(settings.webSocketUrl);
          var protocol = url.protocol === 'ws' ? 'http' : 'https';
          var uri = protocol + '://' + url.hostname + ":" + url.port + image.uri;
          return angular.extend({ uri });
        } else {
          return image;
        }
      } : angular.identity;

      return connection().then(function(mopidy) {
        return mopidy.library.getImages({uris: uris});
      }).then(function(result) {
        return angular.forEach(result, function(images, uri, obj) {
          obj[uri] = images ? images.map(resolve) : images;
        });
      });
    };
  });

})(angular.module('app.coverart.mopidy', ['app.services.connection']));
