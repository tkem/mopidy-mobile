angular.module('mopidy-mobile.locales', ['pascalprecht.translate'])
  .constant('locales', {
    'en': {
      displayName: 'English',
      messages: {
        'About Mopidy Mobile': 'About Mopidy Mobile',
        'Add server': 'Add server',
        'Add stream': 'Add stream',
        'Add to tracklist': 'Add to tracklist',
        'Cache settings': 'Cache settings',
        'Cache size': 'Cache size',
        'Cancel': 'Cancel',
        'Clear': 'Clear',
        'Clear cache': 'Clear cache',
        'Connection OK': 'Connection OK',
        'Connection error': 'Connection error',
        'Consume': 'Consume',
        'Cover art': 'Cover art',
        'Cover art sources': 'Cover art sources',
        'Create playlist': 'Create playlist',
        'Default click action': 'Default click action',
        'Delete': 'Delete',
        'Done': 'Done',
        'Edit playlist': 'Edit playlist',
        'Edit tracklist': 'Edit tracklist',
        'Empty': 'Empty',
        'Enable': 'Enable',
        'Host': 'Host',
        'Ignore': 'Ignore',
        'Language': 'Language',
        'Library': 'Library',
        'Licensed under the': 'Licensed under the',
        'Log debug messages': 'Log debug messages',
        'Logging & Debugging': 'Logging &amp; Debugging',
        'Manage servers': 'Manage Servers',
        'Mopidy Mobile makes use of the following libraries, fonts and frameworks:': 'Mopidy Mobile makes use of the following libraries, fonts and frameworks:',
        'Mopidy server': 'Mopidy server',
        'Name': 'Name',
        'No log records available.': 'No log records available.',
        'Nothing playing': 'Nothing playing',
        'OK': 'OK',
        'Path': 'Path',
        'Play next': 'Play next',
        'Play now': 'Play now',
        'Play stream': 'Play stream',
        'Playback': 'Playback',
        'Playlist saved': 'Playlist saved',
        'Playlists': 'Playlists',
        'Port': 'Port',
        'Pull to refresh': 'Pull to refresh',
        'Random': 'Random',
        'Remove': 'Remove',
        'Rename': 'Rename',
        'Repeat': 'Repeat',
        'Replace tracklist': 'Replace tracklist',
        'Retry': 'Retry',
        'Save as': 'Save as',
        'Save': 'Save',
        'Search': 'Search',
        'Search here': 'Search here',
        'Search results for': 'Search results for',
        'Search results': 'Search results',
        'Secure connection': 'Secure connection',
        'Settings': 'Settings',
        'Single': 'Single',
        'Sort by name': 'Sort by name',
        'Sort by scheme': 'Sort by scheme',
        'Test': 'Test',
        'Theme': 'Theme',
        'Tracklist': 'Tracklist',
        'Version {version}': 'Version {{version}}',
        '{count} tracks': '{{count}} tracks',
        '{index} of {count}': '{{index}} of {{count}}',
      }
    },

    'de': {
      displayName: 'Deutsch',
      messages: {
        'About Mopidy Mobile': 'Über Mopidy Mobile',
        'Add server': 'Server hinzufügen',
        'Add stream': 'Stream hinzufügen',
        'Add to tracklist': 'Titel hinzufügen',
        'Cache settings': 'Cache Einstellungen',
        'Cache size': 'Cachegröße',
        'Cancel': 'Abbrechen',
        'Clear': 'Leeren',
        'Clear cache': 'Cache leeren',
        'Connection OK': 'Verbindung OK',
        'Connection error': 'Verbindungsfehler',
        'Consume': 'Verbrauchsmodus',
        'Cover art': 'Artwork',  // according to Wikipedia...
        'Cover art sources': 'Artwork Quellen',
        'Create playlist': 'Playlist erstellen',
        'Default click action': 'Beim Klicken',
        'Delete': 'Löschen',
        'Done': 'Fertig',
        'Edit playlist': 'Liste bearbeiten',
        'Edit tracklist': 'Titel bearbeiten',
        'Empty': 'Leer',
        'Enable': 'Aktivieren',
        'Host': 'Host',
        'Ignore': 'Ignorieren',
        'Language': 'Sprache',
        'Library': 'Bibliothek',
        'Licensed under the': 'Lizenziert unter der',
        'Log debug messages': 'Debug-Meldungen anzeigen',
        'Logging & Debugging': 'Protokoll &amp; Fehlersuche',
        'Manage servers': 'Server verwalten',
        'Mopidy Mobile makes use of the following libraries, fonts and frameworks:': 'Mopidy Mobile verwendet folgende Bibliotheken, Schriftarten und Frameworks:',
        'Mopidy server': 'Mopidy Server',
        'Name': 'Name',
        'No log records available.': 'Keine Protokolldaten vorhanden.',
        'Nothing playing': 'Nichts spielt',
        'OK': 'OK',
        'Path': 'Pfad',
        'Play next': 'Als nächstes spielen',
        'Play now': 'Jetzt spielen',
        'Play stream': 'Stream abspielen',
        'Playback': 'Wiedergabe',
        'Playlist saved': 'Liste gespeichert',
        'Playlists': 'Listen',
        'Port': 'Port',
        'Pull to refresh': 'Zum Aktualisieren ziehen',
        'Random': 'Zufällig',
        'Remove': 'Löschen',
        'Rename': 'Umbenennen',
        'Repeat': 'Wiederholen',
        'Replace tracklist': 'Titel ersetzen',
        'Retry': 'Wiederholen',
        'Save as': 'Speichern unter',
        'Save': 'Speichern',
        'Search': 'Suchen',
        'Search here': 'Hier suchen',
        'Search results for': 'Suchergebnisse für',
        'Search results': 'Suchergebnisse',
        'Secure connection': 'Sichere Verbindung',
        'Settings': 'Einstellungen',
        'Single': 'Einzelmodus',
        'Sort by name': 'Nach Name',
        'Sort by scheme': 'Nach Schema',
        'Test': 'Test',
        'Theme': 'Thema',  // FIXME!
        'Tracklist': 'Titel',
        'Version {version}': 'Version {{version}}',
        '{count} tracks': '{{count}} Titel',
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
