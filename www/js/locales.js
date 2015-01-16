angular.module('app.locales', ['pascalprecht.translate'])

  .constant('locales', {
    'en': {
      displayName: 'English',
      messages: {
        'Clear Tracklist': 'Clear Tracklist',
        'Clear': 'Clear',
        'Clear...': 'Clear&hellip;',
        'Consume': 'Consume',
        'Edit': 'Edit',
        'Empty': 'Empty',
        'Language': 'Language',
        'Library': 'Library',
        'Nothing playing': 'Nothing playling',
        'Play All': 'Play All',
        'Playback': 'Playback',
        'Playlists': 'Playlists',
        'Pull to refresh': 'Pull to refresh',
        'Random': 'Random',
        'Remove': 'Remove',
        'Repeat': 'Repeat',
        'Save as...': 'Save as&hellip;',
        'Save': 'Save',
        'Search here...': 'Search here...',
        'Settings': 'Settings',
        'Single': 'Single',
        'Theme': 'Theme',
        'Tracklist': 'Tracklist',
        '{count} Tracks': '{{count}} Tracks',
        '{index} of {count}': '{{index}} of {{count}}',
      }
    },
    'de': {
      displayName: 'Deutsch',
      messages: {
        'Clear Tracklist': 'Titel löschen',
        'Clear': 'Leeren',
        'Clear...': 'Leeren&hellip;',
        'Consume': 'Verbrauchsmodus',  // FIXME!
        'Edit': 'Bearbeiten',
        'Empty': 'Leer',
        'Language': 'Sprache',
        'Library': 'Bibliothek',
        'Nothing playing': 'Nichts spielt',
        'Play All': 'Alle abspielen',
        'Playback': 'Wiedergabe',
        'Playlists': 'Listen',
        'Pull to refresh': 'Zum Aktualisieren ziehen',
        'Random': 'Zufällig',
        'Remove': 'Löschen',
        'Repeat': 'Wiederholen',
        'Save as...': 'Speichern unter&hellip;',
        'Save': 'Speichern',
        'Search here...': 'Hier suchen...',
        'Settings': 'Einstellungen',
        'Single': 'Einzelmodus',
        'Theme': 'Design',  // FIXME!
        'Tracklist': 'Titel',
        '{count} Tracks': '{{count}} Titel',
        '{index} of {count}': '{{index}} von {{count}}',
      }
    }
  })

  .factory('missingTranslationHandler', function($log) {
    return function(translationId) {
      $log.warn('Missing translation: ' + translationId);
    };
  })

  .filter('duration', function() {
    // TODO: (potentially) locale-specific handling
    return function(ms) {
      if (ms === undefined || ms === null) {
        return 'n/a';
      }
      var s = Math.round(ms / 1000);
      var sec = s % 60;
      var min = parseInt(s / 60);
      var value = min + ':' + (sec < 10 ? '0' : '') + sec;
      //$log.log('duration', ms, value);
      return value;
    };
  })

  .config(function($translateProvider, locales) {
    angular.forEach(locales, function(locale, id) {
      $translateProvider.translations(id, locale.messages);
    });
    $translateProvider.useMissingTranslationHandler('missingTranslationHandler');
  })
;
