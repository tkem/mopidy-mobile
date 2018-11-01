;(function(module) {
  'use strict';

  function getNotificationSubtitle(scope) {
    if (scope.streamTitle) {
      return scope.streamTitle;
    } else if (!scope.track) {
      return 'n/a';  // this shouldn't happen
    } else if (scope.track.artists && scope.track.artists.length) {
      return scope.track.artists.map(function(obj) { return obj.name; }).join(' ');
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
    provider.$get = function($ionicPlatform, $log, $q, $window) {
      var service = provider;
      var playbackScope = null;
      var paused = false;

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
        return $ionicPlatform.ready().then(function() {
          return $q(function(resolve, reject) {
            if (scope && scope.track) {
              $window.MusicControls.create({
                track: scope.track.name || scope.track.uri || '',
                artist: getNotificationSubtitle(scope),
                cover: scope.image && scope.image.uri ? scope.image.uri : 'app/settings/icon.png',
                dismissable: paused,
                isPlaying: scope.state === 'playing',
                hasPrev: scope.hasPrevious,
                hasNext: scope.hasNext,
                hasClose: false
              }, resolve, reject);
            } else {
              $window.MusicControls.destroy(resolve, reject);
            }
            playbackScope = scope;
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
        $window.document.addEventListener('pause', function() {
          $window.MusicControls.updateDismissable(true);
          paused = true;
        });
        $window.document.addEventListener('resume', function() {
          $window.MusicControls.updateDismissable(false);
          paused = false;
        });
        $window.MusicControls.subscribe(function(action) {
          if (playbackScope) {
            switch(JSON.parse(action).message) {
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
