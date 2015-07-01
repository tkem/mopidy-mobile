angular.module('mopidy-mobile.coverart.archive', [
  'mopidy-mobile.coverart',
]).config(function(coverartProvider) {
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
