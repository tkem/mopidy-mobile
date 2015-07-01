angular.module('mopidy-mobile.coverart.lastfm', [
  'mopidy-mobile.coverart',
]).config(function(coverartProvider) {
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
