;(function(module) {
  'use strict';

  module.config(function(localeProvider) {
    localeProvider.locale('en', {
      language: 'en',
      displayName: 'English',
      messages: {
        'About': 'About',
        'Add server': 'Add server',
        'Add stream': 'Add stream',
        'Add to playlist': 'Add to playlist',
        'Add to tracklist': 'Add to tracklist',
        'Album artist': 'Album artist',
        'Album': 'Album',
        'Any': 'Any',
        'Artist': 'Artist',
        'Back': 'Back',
        'Bitrate': 'Bitrate',
        'Cancel': 'Cancel',
        'Clear cache': 'Clear cache',
        'Clear tracklist': 'Clear tracklist',
        'Clear': 'Clear',
        'Comment': 'Comment',
        'Composer': 'Composer',
        'Configured servers': 'Configured servers',
        'ConnectionError': 'Connection error',
        'Consume mode': 'Consume mode',
        'Cover art': 'Cover art',
        'Create playlist': 'Create playlist',
        'Date': 'Date',
        'Debug messages': 'Debug messages',
        'Default click action': 'Default click action',
        'Default': 'Default',
        'Delete playlist': 'Delete playlist',
        'Delete': 'Delete',
        'Done': 'Done',
        'Duration': 'Duration',
        'Edit playlist': 'Edit playlist',
        'Edit playlists': 'Edit playlists',
        'Edit tracklist': 'Edit tracklist',
        'Error': 'Error',
        'Exit': 'Exit',
        'Find exact': 'Find exact',
        'Genre': 'Genre',
        'Host': 'Host',
        'Ignore': 'Ignore',
        'Language': 'Language',
        'Library': 'Library',
        'Licenses': 'Licenses',
        'Logging': 'Logging',
        'Look and feel': 'Look and feel',
        'Mopidy servers': 'Mopidy servers',
        'Name': 'Name',
        'No servers found': 'No servers found',
        'Nothing playing': 'Nothing playing',
        'OK': 'OK',
        'Path': 'Path',
        'Performer': 'Performer',
        'Play next': 'Play next',
        'Play now': 'Play now',
        'Playback': 'Playback',
        'Playlists': 'Playlists',
        'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.': 'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.',
        'Port': 'Port',
        'Pull to refresh': 'Pull to refresh',
        'Remove server': 'Remove server',
        'Replace tracklist': 'Replace tracklist',
        'Request timeout': 'Request timeout',
        'Reset all settings to default values and restart application': 'Reset all settings to default values and restart application',
        'Reset': 'Reset',
        'Restart application': 'Restart application',
        'Restart': 'Restart',
        'Retry': 'Retry',
        'Save as': 'Save as',
        'Save': 'Save',
        'Search here': 'Search here',
        'Search results': 'Search results',
        'Search term': 'Search term',
        'Search {name}': 'Search {name}',
        'Search': 'Search',
        'Secure connection': 'Secure connection',
        'ServerError': 'Server error',
        'Settings': 'Settings',
        'Show track info': 'Show track info',
        'Sort by name': 'Sort by name',
        'Sort by scheme': 'Sort by scheme',
        'Theme': 'Theme',
        'Then pull to refresh, or add a server manually.': 'Then pull to refresh, or add a server manually.',
        'TimeoutError': 'Timeout error',
        'Track info': 'Track info',
        'Tracklist': 'Tracklist',
        'Track': 'Track',
        'Translations': 'Translations',
        'URI': 'URI',
        'URL': 'URL',
        'Version {version}': 'Version {version}',
        '{count} seconds': '{count, plural, one{1 second} other{# seconds}}',
        '{count} tracks': '{count, plural, =0{No tracks} one{1 track} other{# tracks}}',
        '{index} of {count}': '{index} of {count}',
      }
    });
  });
})(angular.module('app.locale.en', ['app.services.locale']));
