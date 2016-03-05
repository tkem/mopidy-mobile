;(function(module) {
  'use strict';

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

  /* @ngInject */
  module.service('coverart.archive', function($q) {

    function resolveImage(uri) {
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
    }

    function getImages(mbid) {
      return resolveImage(baseURI + mbid + '/front').then(function(image) {
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
      models.forEach(function(model) {
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

})(angular.module('app.coverart.archive', []));
