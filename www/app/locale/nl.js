;(function(module) {
  'use strict';

  module.config(function(localeProvider) {
    localeProvider.locale('nl', {
      language: 'nl',
      displayName: 'Nederlands',
      messages: {
        'About': 'Over',
        'Add server': 'Server toevoegen',
        'Add stream': 'Stream toevoegen',
        'Add to playlist': 'Toevoegen aan afspeellijst',
        'Add to tracklist': 'Toevoegen aan tracklijst',
        'Album artist': 'Album artiest',
        'Album': 'Album',
        'Any': 'Elke',
        'Artist': 'Artiest',
        'Back': 'Terug',
        'Bitrate': 'Bitrate',
        'Cancel': 'Annuleren',
        'Clear cache': 'Cache wissen',
        'Clear tracklist': 'Tracklijst wissen',
        'Clear': 'Wissen',
        'Comment': 'Commentaar',
        'Composer': 'Componist',
        'Configured servers': 'Geconfigureerde servers',
        'ConnectionError': 'Verbindingsfout',
        'Consume mode': 'Consumeer modus',
        'Cover art': 'Hoes afbeelding',
        'Create playlist': 'Creëer afspeellijst',
        'Date': 'Datum',
        'Debug messages': 'Debugberichten',
        'Default click action': 'Standaard klikactie',
        'Default': 'Standaard',
        'Delete playlist': 'Verwijder afspeellijst',
        'Delete': 'Verwijder',
        'Disc number': 'Schijfnummer',
        'Done': 'Gereed',
        'Duration': 'Tijdsduur',
        'Edit playlist': 'Bewerk afspeellijst',
        'Edit playlists': 'Bewerk afspeellijsten',
        'Edit tracklist': 'Bewerk tracklijst',
        'Error': 'Fout',
        'Exit': 'Afsluiten',
        'Find exact': 'Vind exact',
        'Genre': 'Genre',
        'Host': 'Host',
        'Ignore': 'Negeer',
        'Language': 'Taal',
        'Library': 'Bibliotheek',
        'Licenses': 'Licenties',
        'Logging': 'Logging',
        'Look and feel': 'Uiterlijk en werking',
        'Mopidy servers': 'Mopidy servers',
        'Name': 'Naam',
        'No servers found': 'Geen servers gevonden',
        'Nothing playing': 'Er speelt niks',
        'OK': 'OK',
        'Path': 'Pad',
        'Performer': 'Artiest',
        'Play next': 'Speel als volgende',
        'Play now': 'Speel nu',
        'Playback': 'Afspelen',
        'Playlists': 'Afspeellijsten',
        'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.': 'Zorg alstublieft dat Zeroconf is aangezet voor alle Mopidy servers in hetzelfde WiFi network als uw apparaat.',
        'Port': 'Poort',
        'Pull to refresh': 'Sleep om te verversen',
        'Remove server': 'Verwijder server',
        'Replace tracklist': 'Vervang tracklijst',
        'Request timeout': 'Aanvraag tijdslimiet',
        'Reset all settings to default values and restart application': 'Zet alle instellingen terug naar standaardwaarden en herstart applicatie',
        'Reset': 'Reset',
        'Restart application': 'Herstart applicatie',
        'Restart': 'Herstart',
        'Retry': 'Opnieuw proberen',
        'Save as': 'Opslaan als',
        'Save': 'Opslaan',
        'Search here': 'Zoek hier',
        'Search results': 'Zoekresultaten',
        'Search term': 'Zoekterm',
        'Search {name}': 'Zoek {name}',
        'Search': 'Zoek',
        'Secure connection': 'Veilige verbinding',
        'ServerError': 'Serverfout',
        'Settings': 'Instellingen',
        'Share': 'Deel',
        'Show track info': 'Toon trackinfo',
        'Sort by name': 'Sorteer op naam',
        'Sort by scheme': 'Sorteer op schema',
        'Theme': 'Thema',
        'Then pull to refresh, or add a server manually.': 'Dan slepen om te verversen, of voeg handmatig een server toe.',
        'TimeoutError': 'Tijdslimiet fout',
        'Track info': 'Trackinfo',
        'Track number': 'Tracknummer',
        'Track': 'Titel',
        'Tracklist': 'Tracklijst',
        'Translations': 'Vertalingen',
        'URI': 'URI',
        'URL': 'URL',
        'Volume keys': 'Volume toetsen',
        '{count} seconds': '{count, plural, one{1 seconde} other{# seconden}}',
        '{count} tracks': '{count, plural, =0{Geen tracks} one{1 track} other{# tracks}}',
        '{index} of {count}': '{index} van {count}',
      }
    });
  });
})(angular.module('app.locale.nl', ['app.services.locale']));
