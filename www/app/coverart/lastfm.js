;(function(module) {
  'use strict';

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
        return undefined;
      }
    },
    'Artist': function(artist) {
      if (artist.musicbrainz_id) {
        return {method: 'artist.getInfo', mbid: artist.musicbrainz_id};
      } else if (artist.name) {
        return {method: 'artist.getInfo', artist: artist.name};
      } else {
        return undefined;
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
        return undefined;
      }
    },
    'Ref': function(/*ref*/) {
      return undefined;
    }
  };

  function createImage(image) {
    return {
      uri: image['#text'],
      width: sizes[image.size],
      height: sizes[image.size]
    };
  }

  function filterImage(image) {
    return image['#text'];  // last.fm return empty URIs for podcasts, for example
  }

  /* @ngInject */
  module.service('coverart.lastfm', function($http, $log, $q) {

    function getImages(params) {
      var config = {params: angular.extend(params, {
        format: 'json',
        callback: 'JSON_CALLBACK',
        api_key: 'fd01fd0378426f85397626d5f8bcc692'
      })};
      return $http.jsonp('http://ws.audioscrobbler.com/2.0/', config).then(function(result) {
        var data = result.data;
        if (data.album && data.album.image) {
          return data.album.image.filter(filterImage).map(createImage);
        } else if (data.artist && data.artist.image) {
          return data.artist.image.filter(filterImage).map(createImage);
        } else if (data.track && data.track.image) {
          return data.track.image.filter(filterImage).map(createImage);
        } else if (data.track && data.track.album && data.track.album.image) {
          return data.track.album.image.filter(filterImage).map(createImage);
        } else {
          return [];
        }
      });
    }

    return function(models) {
      var images = {};
      var promises = {};
      models.forEach(function(model) {
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
      return $q.all(images).catch(function(error) {
        $log.error('Error loading last.fm cover art', error);
        return {};
      });
    };
  });

})(angular.module('app.coverart.lastfm', []));
