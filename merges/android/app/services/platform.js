;(function(module) {
  'use strict';

  function getTitle(scope) {
    return scope.track ? scope.track.name || scope.track.uri || '' : '';
  }

  function getSubtitle(scope) {
    if (!scope.track) {
      return scope.streamTitle || '';
    } else if (scope.track.artists && scope.track.artists.length) {
      return scope.track.artists.map(function(obj) { return obj.name }).join(' ');
    } else if (scope.track.album && scope.track.album.name) {
      return scope.track.album.name;
    } else {
      return scope.track.genre || '';
    }
  }

  /* @ngInject */
  module.provider('platform', function PlatformProvider() {
    var provider = this;

    provider.isHosted = function() {
      return false;
    };

    provider.isWebView = function() {
      return true;
    };

    /* @ngInject */
    provider.$get = function($ionicPlatform, $q, $window) {
      var service = provider;
      var playbackScope = null;

      service.appVersion = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.AppVersion.version;
        });
      };

      service.exitApp = function() {
        ionic.Platform.exitApp();
      };

      service.share = function(subject, message) {
        return $ionicPlatform.ready().then(function() {
          return $q(function(resolve, reject) {
            return $window.plugins.socialsharing.shareWithOptions({
              subject: subject,
              message: message
            }, resolve, reject);
          });
        });
      };

      service.splashscreen = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.navigator.splashscreen;
        });
      };

      service.updatePlaybackControls = function(scope) {
        playbackScope = scope;
        return $ionicPlatform.ready().then(function() {
          return $q(function(resolve, reject) {
            $window.MusicControls.create({
              track: getTitle(scope),
              artist: getSubtitle(scope),
              cover: scope.image && scope.image.uri ? scope.image.uri : 'app/settings/icon.png',
              isPlaying: scope.state === 'playing',
              hasPrev: scope.hasPrevious,
              hasNext: scope.hasNext,
              hasClose: false  // TBD
            }, resolve, reject);
          });
        });
      };

      service.updatePlaybackState = function(state) {
        return $ionicPlatform.ready().then(function() {
          $window.MusicControls.updateIsPlaying(state === 'playing');
        });
      };

      service.zeroconf = function() {
        return $ionicPlatform.ready().then(function() {
          return $window.cordova.plugins.zeroconf;
        });
      };

      $ionicPlatform.ready().then(function() {
        $window.MusicControls.subscribe(function(action) {
          if (playbackScope) {
            switch(action) {
            case 'music-controls-next':
              playbackScope.next();
              break;
            case 'music-controls-previous':
              playbackScope.previous();
              break;
            case 'music-controls-pause':
              playbackScope.pause();
              break;
            case 'music-controls-play':
              playbackScope.play();
              break;
            case 'music-controls-destroy':
              ionic.Platform.exitApp();
              break;
            }
          }
        });
        $window.MusicControls.listen();
      });

      return service;
    };
  });

})(angular.module('app.services.platform', ['ionic']));
