angular.module('mopidy-mobile.locale', [
  'pascalprecht.translate'
])

.config(function($translateProvider) {
  $translateProvider.useLoader('translationLoader');
  $translateProvider.useMissingTranslationHandler('missingTranslationHandler');
})

.config(function(localeProvider) {
  localeProvider.locale('en', {
    displayName: 'English',
    messages: {
      'About': 'About',
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
      'Licenses': 'Licenses',
      'Log debug messages': 'Log debug messages',
      'Logging': 'Logging',
      'Manage servers': 'Manage Servers',
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
      'User interface': 'User interface',
      'Version {version}': 'Version {{version}}',
      '{count} tracks': '{{count}} tracks',
      '{index} of {count}': '{{index}} of {{count}}',
    }
  });
})

.config(function(localeProvider) {
  localeProvider.locale('de', {
    displayName: 'Deutsch',
    messages: {
      'About': 'Über',
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
      'Cover art': 'Albumcover',
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
      'Licenses': 'Lizenzen',
      'Log debug messages': 'Debug-Meldungen anzeigen',
      'Logging': 'Protokoll',
      'Manage servers': 'Server verwalten',
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
      'User interface': 'Benutzeroberfläche',
      'Version {version}': 'Version {{version}}',
      '{count} tracks': '{{count}} Titel',
      '{index} of {count}': '{{index}} von {{count}}',
    }
  });
})

.factory('translationLoader', function($q, locale) {
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

.provider('locale', function() {
  var locales = {};
  var provider = angular.extend(this, {
    $get: function($log, $translate, util) {
      function getLocale() {
        var languages = util.getLanguages();
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
          $translate.use(locale = id || getLocale());
        }
      };
    },
    fallback: 'en',
    locale: function(id, obj) {
      locales[id] = obj;
    }
  });
})
;
