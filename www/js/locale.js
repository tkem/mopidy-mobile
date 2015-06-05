angular.module('mopidy-mobile.locale', [
  'pascalprecht.translate'
])

.config(function($translateProvider) {
  $translateProvider.useLoader('translationLoader');
  $translateProvider.useMissingTranslationHandler('missingTranslationHandler');
  $translateProvider.useSanitizeValueStrategy('escaped');
})

.config(function(localeProvider) {
  localeProvider.locale('en', {
    displayName: 'English',
    messages: {
      'About': 'About',
      'Add stream': 'Add stream',
      'Add to tracklist': 'Add to tracklist',
      'Back': 'Back',
      'Cancel': 'Cancel',
      'Clear cache': 'Clear cache',
      'Clear tracklist': 'Clear tracklist',
      'Clear': 'Clear',
      'Connection error': 'Connection error',
      'Consume mode': 'Consume mode',
      'Cover art': 'Cover art',
      'Create playlist': 'Create playlist',
      'Debug messages': 'Debug messages',
      'Default click action': 'Default click action',
      'Default': 'Default',
      'Delete this playlist': 'Delete this playlist',
      'Delete': 'Delete',
      'Done': 'Done',
      'Edit playlist': 'Edit playlist',
      'Edit tracklist': 'Edit tracklist',
      'Empty': 'Empty',
      'Exit': 'Exit',
      'Ignore': 'Ignore',
      'Language': 'Language',
      'Library': 'Library',
      'Licenses': 'Licenses',
      'Logging': 'Logging',
      'Look and feel': 'Look and feel',
      'Servers': 'Servers',
      'Name': 'Name',
      'No servers found': 'No servers found',
      'Nothing playing': 'Nothing playing',
      'OK': 'OK',
      'Play next': 'Play next',
      'Play now': 'Play now',
      'Playback': 'Playback',
      'Playlists': 'Playlists',
      'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.': 'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.',
      'Pull to refresh': 'Pull to refresh',
      'Replace tracklist': 'Replace tracklist',
      'Reset all settings to default values and restart application': 'Reset all settings to default values and restart application',
      'Restart application': 'Restart application',
      'Restart': 'Restart',
      'Reset': 'Reset',
      'Retry': 'Retry',
      'Save as': 'Save as',
      'Save': 'Save',
      'Search here': 'Search here',
      'Search results': 'Search results',
      'Search': 'Search',
      'Settings': 'Settings',
      'Sort by name': 'Sort by name',
      'Sort by scheme': 'Sort by scheme',
      'Theme': 'Theme',
      'Then pull to refresh, or restart the application.': 'Then pull to refresh, or restart the application.',
      'Tracklist': 'Tracklist',
      'Version {version} ({platform})': 'Version {{version}} ({{platform}})',
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
      'Add stream': 'Stream hinzufügen',
      'Add to tracklist': 'Titel hinzufügen',
      'Back': 'Zurück',
      'Cancel': 'Abbrechen',
      'Clear cache': 'Cache leeren',
      'Clear tracklist': 'Titel leeren',
      'Clear': 'Leeren',
      'Connection error': 'Verbindungsfehler',
      'Consume mode': 'Verbrauchsmodus',
      'Cover art': 'Albumcover',
      'Create playlist': 'Liste erstellen',
      'Debug messages': 'Debug-Meldungen',
      'Default click action': 'Beim Klicken',
      'Default': 'Standard',
      'Delete this playlist': 'Diese Liste löschen',
      'Delete': 'Löschen',
      'Done': 'Fertig',
      'Edit playlist': 'Liste bearbeiten',
      'Edit tracklist': 'Titel bearbeiten',
      'Empty': 'Leer',
      'Exit': 'Beenden',
      'Ignore': 'Ignorieren',
      'Language': 'Sprache',
      'Library': 'Bibliothek',
      'Licenses': 'Lizenzen',
      'Logging': 'Protokollierung',
      'Look and feel': 'Erscheinungsbild',  // a.k.a. "Aussehen und Verhalten"
      'Servers': 'Server',
      'Name': 'Name',
      'No servers found': 'Keine Server gefunden',
      'Nothing playing': 'Nichts spielt',
      'OK': 'OK',
      'Play next': 'Als nächstes spielen',
      'Play now': 'Jetzt spielen',
      'Playback': 'Wiedergabe',
      'Playlists': 'Listen',
      'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.': 'Bitte stellen Sie sicher, dass Zeroconf für alle Mopidy-Server im WLAN-Netzwerk Ihres Gerätes aktiviert ist.',
      'Pull to refresh': 'Zum Aktualisieren ziehen',
      'Replace tracklist': 'Titel ersetzen',
      'Reset all settings to default values and restart application': 'Alle Einstellungen auf Standardwerte zurücksetzen und Applikation neu starten',
      'Restart application': 'Applikation neu starten',
      'Restart': 'Neustart',
      'Reset': 'Zurücksetzen',
      'Retry': 'Wiederholen',
      'Save as': 'Speichern unter',
      'Save': 'Speichern',
      'Search here': 'Hier suchen',
      'Search results': 'Suchergebnisse',
      'Search': 'Suchen',
      'Settings': 'Einstellungen',
      'Sort by name': 'Nach Name',
      'Sort by scheme': 'Nach Schema',
      'Theme': 'Design',
      'Then pull to refresh, or restart the application.': 'Then ziehen Sie zum Aktualisieren, oder starten Sie die Applikation neu.',
      'Tracklist': 'Titel',
      'Version {version} ({platform})': 'Version {{version}} ({{platform}})',
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
    $get: function($ionicConfig, $log, $translate, util) {
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
          locale = id || getLocale();
          $ionicConfig.backButton.text(locales[locale].messages['Back']);
          $translate.use(locale);
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
