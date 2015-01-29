angular.module('mopidy-mobile.locales', ['pascalprecht.translate'])
  .constant('locales', {
    'en': {
      displayName: 'English',
      messages: {
        'Add Tracks to Tracklist': 'Add Tracks to Tracklist',
        'Add to Tracklist': 'Add to Tracklist',
        'Cancel': 'Cancel',
        'Clear Tracklist': 'Clear Tracklist',
        'Clear': 'Clear',
        'Connection': 'Connection',
        'Consume': 'Consume',
        'Default Click Action': 'Default Click Action',
        'Edit': 'Edit',
        'Empty': 'Empty',
        'Enable Debugging': 'Enable Debugging',
        'Error saving playlist': 'Error saving playlist',
        'Language': 'Language',
        'Library': 'Library',
        'Nothing playing': 'Nothing playling',
        'OK': 'OK',
        'Play All Tracks': 'Play All Tracks',
        'Play All': 'Play All',
        'Play Track': 'Play Track',
        'Playback': 'Playback',
        'Playlist Name': 'Playlist Name',
        'Playlist saved': 'Playlist saved',
        'Playlists': 'Playlists',
        'Pull to refresh': 'Pull to refresh',
        'Random': 'Random',
        'Remove': 'Remove',
        'Repeat': 'Repeat',
        'Replace Current Tracklist': 'Replace Current Tracklist',
        'Save as Playlist': 'Save as Playlist',
        'Save as': 'Save as',
        'Save': 'Save',
        'Search Results': 'Search Results',
        'Search Results for': 'Search Results for',
        'Search here': 'Search here',
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
        'Add Tracks to Tracklist': 'Titel hinzufügen',
        'Add to Tracklist': 'Titel hinzufügen',
        'Cancel': 'Abbrechen',
        'Clear Tracklist': 'Titel löschen',
        'Clear': 'Leeren',
        'Connection': 'Verbindung',
        'Consume': 'Verbrauchsmodus',  // FIXME!
        'Default Click Action': 'Beim Klicken',
        'Edit': 'Bearbeiten',
        'Empty': 'Leer',
        'Enable Debugging': 'Debugging aktivieren',
        'Error saving playlist': 'Fehler beim Speichern der Playlist',
        'Language': 'Sprache',
        'Library': 'Bibliothek',
        'Nothing playing': 'Nichts spielt',  // FIXMEQ
        'OK': 'OK',
        'Play All Tracks': 'Alle Titel abspielen',
        'Play All': 'Alle abspielen',
        'Play Track': 'Titel abspielen',
        'Playback': 'Wiedergabe',
        'Playlist Name': 'Name der Playlist',
        'Playlist saved': 'Playlist gespeichert',
        'Playlists': 'Listen',
        'Pull to refresh': 'Zum Aktualisieren ziehen',
        'Random': 'Zufällig',
        'Remove': 'Löschen',
        'Repeat': 'Wiederholen',
        'Replace Current Tracklist': 'Titel ersetzen',
        'Save as Playlist': 'Als Playlist speichern',
        'Save as': 'Speichern unter',
        'Save': 'Speichern',
        'Search Results': 'Suchergebnisse',
        'Search Results for': 'Ergebnisse für',
        'Search here': 'Hier suchen',
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
