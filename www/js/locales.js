angular.module('mopidy-mobile.locales', ['pascalprecht.translate'])
  .constant('locales', {
    'en': {
      displayName: 'English',
      messages: {
        'About Mopidy Mobile': 'About Mopidy Mobile',
        'Add New Server': 'Add New Server',
        'Add Stream': 'Add Stream',
        'Add to Tracklist': 'Add to Tracklist',
        'Cancel': 'Cancel',
        'Clear Log': 'Clear Log',
        'Clear Tracklist': 'Clear Tracklist',
        'Clear': 'Clear',
        'Connection Error': 'Connection Error',
        'Connection OK': 'Connection OK',
        'Consume': 'Consume',
        'Cover Art': 'Cover Art',
        'Default Click Action': 'Default Click Action',
        'Delete': 'Delete',
        'Done': 'Done',
        'Edit Tracklist': 'Edit Tracklist',
        'Empty': 'Empty',
        'Enable Logging': 'Enable Logging',
        'Ignore': 'Ignore',
        'Language': 'Language',
        'Library': 'Library',
        'Licensed under the': 'Licensed under the',
        'Log Debug Messages': 'Log Debug Messages',
        'Logging & Debugging': 'Logging &amp; Debugging',
        'Manage Servers': 'Manage Servers',
        'Mopidy Mobile makes use of the following libraries, fonts and frameworks:': 'Mopidy Mobile makes use of the following libraries, fonts and frameworks:',
        'Mopidy Server': 'Mopidy Server',
        'Nothing playing': 'Nothing playing',
        'OK': 'OK',
        'Play Next': 'Play Next',
        'Play Now': 'Play Now',
        'Playback': 'Playback',
        'Playlist Name': 'Playlist Name',
        'Playlist saved': 'Playlist saved',
        'Playlists': 'Playlists',
        'Pull to refresh': 'Pull to refresh',
        'Random': 'Random',
        'Remove': 'Remove',
        'Rename': 'Rename',
        'Repeat': 'Repeat',
        'Replace Tracklist': 'Replace Tracklist',
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
        'Version {version}': 'Version {{version}}',
        'WebSocket Path': 'WebSocket Path',
        '{count} Tracks': '{{count}} Tracks',
        '{index} of {count}': '{{index}} of {{count}}',
        'No log records available.': 'No log records available.',
      }
    },

    'de': {
      displayName: 'Deutsch',
      messages: {
        'About Mopidy Mobile': 'Über Mopidy Mobile',
        'Add New Server': 'Neuen Server hinzufügen',
        'Add Stream': 'Stream hinzufügen',
        'Add to Tracklist': 'Titel hinzufügen',
        'Cancel': 'Abbrechen',
        'Clear Log': 'Protokoll löschen',
        'Clear Tracklist': 'Titel löschen',
        'Clear': 'Leeren',
        'Connection Error': 'Verbindungsfehler',
        'Connection OK': 'Verbindung OK',
        'Consume': 'Verbrauchsmodus',
        'Cover Art': 'Artwork',  // according to Wikipedia...
        'Default Click Action': 'Beim Klicken',
        'Delete': 'Löschen',
        'Done': 'Fertig',
        'Edit Tracklist': 'Titel bearbeiten',
        'Empty': 'Leer',
        'Enable Logging': 'Protokollierung aktivieren',
        'Ignore': 'Ignorieren',
        'Language': 'Sprache',
        'Library': 'Bibliothek',
        'Licensed under the': 'Lizenziert unter der',
        'Log Debug Messages': 'Debug-Meldungen anzeigen',
        'Logging & Debugging': 'Protokoll &amp; Fehlersuche',
        'Manage Servers': 'Server verwalten',
        'Mopidy Mobile makes use of the following libraries, fonts and frameworks:': 'Mopidy Mobile verwendet folgende Bibliotheken, Schriftarten und Frameworks:',
        'Mopidy Server': 'Mopidy Server',
        'Nothing playing': 'Nichts spielt',
        'OK': 'OK',
        'Play Next': 'Als nächstes spielen',
        'Play Now': 'Jetzt spielen',
        'Playback': 'Wiedergabe',
        'Playlist Name': 'Name der Playlist',
        'Playlist saved': 'Playlist gespeichert',
        'Playlists': 'Listen',
        'Pull to refresh': 'Zum Aktualisieren ziehen',
        'Random': 'Zufällig',
        'Remove': 'Löschen',
        'Rename': 'Umbenennen',
        'Repeat': 'Wiederholen',
        'Replace Tracklist': 'Titel ersetzen',
        'Retry': 'Wiederholen',
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
        'Version {version}': 'Version {{version}}',
        'WebSocket Path': 'WebSocket Pfad',
        '{count} Tracks': '{{count}} Titel',
        '{index} of {count}': '{{index}} von {{count}}',
        'No log records available.': 'Keine Protokolldaten vorhanden.',
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
