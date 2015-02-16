angular.module('mopidy-mobile.locales', ['pascalprecht.translate'])
  .constant('locales', {
    'en': {
      displayName: 'English',
      messages: {
        'About Mopidy Mobile': 'About Mopidy Mobile',
        'Add New Server': 'Add New Server',
        'Add Tracks to Tracklist': 'Add Tracks to Tracklist',
        'Add URL': 'Add URL',
        'Add to Tracklist': 'Add to Tracklist',
        'Cancel': 'Cancel',
        'Clear Tracklist': 'Clear Tracklist',
        'Clear': 'Clear',
        'Consume': 'Consume',
        'Default Click Action': 'Default Click Action',
        'Delete': 'Delete',
        'Empty': 'Empty',
        'Enable Logging': 'Enable Logging',
        'Ignore': 'Ignore',
        'Language': 'Language',
        'Library': 'Library',
        'Log Debug Messages': 'Log Debug Messages',
        'Logging': 'Logging',
        'Manage Servers': 'Manage Servers',
        'Mopidy Server': 'Mopidy Server',
        'Nothing playing': 'Nothing playing',
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
        'Retry': 'Retry',
        'Save as': 'Save as',
        'Save': 'Save',
        'Search Results for': 'Search Results for',
        'Search Results': 'Search Results',
        'Search here': 'Search here',
        'Secure Connection': 'Secure Connection',
        'Server Host': 'Server Host',
        'Server Name': 'Server Name',
        'Server Port': 'Server Port',
        'Settings': 'Settings',
        'Single': 'Single',
        'Test': 'Test',
        'Theme': 'Theme',
        'Tracklist': 'Tracklist',
        'WebSocket Path': 'WebSocket Path',
        '{count} Tracks': '{{count}} Tracks',
        '{index} of {count}': '{{index}} of {{count}}',
      }
    },

    'de': {
      displayName: 'Deutsch',
      messages: {
        'About Mopidy Mobile': 'Über Mopidy Mobile',
        'Add New Server': 'Neuen Server hinzufügen',
        'Add Tracks to Tracklist': 'Titel hinzufügen',
        'Add URL': 'URL hinzufügen',
        'Add to Tracklist': 'Titel hinzufügen',
        'Cancel': 'Abbrechen',
        'Clear Tracklist': 'Titel löschen',
        'Clear': 'Leeren',
        'Consume': 'Verbrauchsmodus',
        'Default Click Action': 'Beim Klicken',
        'Delete': 'Löschen',
        'Empty': 'Leer',
        'Enable Logging': 'Logging aktivieren',
        'Ignore': 'Ignorieren',
        'Language': 'Sprache',
        'Library': 'Bibliothek',
        'Log Debug Messages': 'Debug-Meldungen anzeigen',
        'Logging': 'Logging',
        'Manage Servers': 'Server verwalten',
        'Mopidy Server': 'Mopidy Server',
        'Nothing playing': 'Nichts spielt',  // FIXME
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
        'Replace Current Tracklist': 'Aktuelle Titel ersetzen',
        'Retry': 'Wiedferholen',
        'Save as Playlist': 'Als Playlist speichern',
        'Save as': 'Speichern unter',
        'Save': 'Speichern',
        'Search Results for': 'Suchergebnisse für',
        'Search Results': 'Suchergebnisse',
        'Search here': 'Hier suchen',
        'Secure Connection': 'Sichere Verbindung',
        'Server Host': 'Server Host',
        'Server Name': 'Server Name',
        'Server Port': 'Server Port',
        'Settings': 'Einstellungen',
        'Single': 'Einzelmodus',
        'Test': 'Test',
        'Theme': 'Thema',  // FIXME!
        'Tracklist': 'Titel',
        'WebSocket Path': 'WebSocket Pfad',
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
