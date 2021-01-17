;(function(module) {
  'use strict';

  function getLanguages() {
    var navigator = window.navigator;
    var properties = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'];
    // support for HTML 5.1 "navigator.languages"
    if (angular.isArray(navigator.languages) && navigator.languages.length) {
      return navigator.languages;
    }
    // support for other well known properties in browsers
    for (var i = 0; i !== properties.length; ++i) {
      var language = navigator[properties[i]];
      if (language && language.length) {
        return [language];
      }
    }
    return [];
  }

  module.config(function($translateProvider) {
    $translateProvider.useLoader('translationLoader');
    $translateProvider.useMissingTranslationHandler('missingTranslationHandler');
    $translateProvider.useSanitizeValueStrategy('escaped');
    $translateProvider.useMessageFormatInterpolation();
  });

  module.factory('missingTranslationHandler', function($log) {
    return function(translationId) {
      $log.warn('Missing translation: ' + translationId);
    };
  });

  module.factory('translationLoader', function($q, locale) {
    return function(options) {
      return $q(function(resolve, reject) {
        var lc = locale.get(options.key);
        if (lc) {
          resolve(lc.messages);
        } else {
          reject(options.key);
        }
      });
    };
  });

  module.filter('duration', function() {
    // TODO: (potentially) locale-specific handling
    return function(ms) {
      if (ms === undefined || ms === null) {
        return 'n/a';
      }
      var s = Math.round(ms / 1000);
      var sec = s % 60;
      var min = parseInt(s / 60);
      var value = min + ':' + (sec < 10 ? '0' : '') + sec;
      return value;
    };
  });

  module.provider('locale', function() {
    var locales = {};
    var provider = angular.extend(this, {
      $get: function($ionicConfig, $log, $translate) {
        function getLocale() {
          var languages = getLanguages();
          $log.debug('Preferred languages: ' + languages);
          for (var i = 0; i !== languages.length; ++i) {
            var fields = angular.lowercase(languages[i]).split(/[^a-z]/);
            for (var j = fields.length; j !== 0; --j) {
              var id = fields.slice(0, j).join('-');
              if (id in locales) {
                $log.debug('Found matching locale: ' + id);
                return id;
              }
            }
          }
          $log.debug('Using fallback locale: ' + provider.fallback);
          return provider.fallback;
        }

        var locale = getLocale();

        return {
          all: function() {
            return locales;
          },
          get: function(id) {
            return locales[id || locale];
          },
          set: function(id) {
            locale = id || getLocale();
            if (locales[locale] && locales[locale].messages) {
              $ionicConfig.backButton.text(locales[locale].messages['Back']);
            }
            return $translate.use(locale);
          }
        };
      },
      fallback: 'en',
      locale: function(id, obj) {
        locales[id] = obj;
      }
    });
  });
})(angular.module('app.services.locale', ['pascalprecht.translate', 'ionic']));
