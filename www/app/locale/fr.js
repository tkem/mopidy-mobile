;(function(module) {
  'use strict';

  module.config(function(localeProvider) {
    localeProvider.locale('fr', {
      language: 'fr',
      displayName: 'Français',
      messages: {
        'About': 'A propos',
        'Add server': 'Ajouter un Server',
        'Add stream': 'Ajouter un Flux',
        'Add to playlist': "Ajouter à la Liste d'écoute",
        'Add to tracklist': 'Ajouter la piste à la liste',
        'Album artist': "Artiste de l'Album",
        'Album': 'Album',
        'Any': 'Tous',
        'Artist': 'Artiste',
        'Back': 'Retour',
        'Bitrate': 'Débit en Bit',
        'Cancel': 'Annuler',
        'Clear cache': 'Effacer le cache',
        'Clear tracklist': 'Effacer la liste des pistes',
        'Clear': 'Effacer',
        'Comment': 'Commentaire',
        'Composer': 'Composer',
        'Configured servers': 'Serveurs Configurés',
        'ConnectionError': 'Erreur de Connection',
        'Consume mode': 'mode Consommateur',
        'Cover art': 'Décor Pochette',
        'Create playlist': "Créer la Liste d'écoute",
        'Date': 'Date',
        'Debug messages': 'Messages de mise au point',
        'Default click action': 'Action par défault',
        'Default': 'Défaut',
        'Delete playlist': "Effacer la Liste d'écoute",
        'Delete': 'Effacer',
        'Disc number': 'Numéro du Disque',
        'Done': 'Terminé',
        'Duration': 'Durée',
        'Edit playlist': "Editer la Liste d'écoute",
        'Edit playlists': "Editer les Listes d'écoute",
        'Edit tracklist': 'Editer la liste des pistes',
        'Error': 'Erreur',
        'Exit': 'Sortie',
        'Find exact': 'Recherche exacte',
        'Genre': 'Genre',
        'Host': 'Hôte',
        'Ignore': 'Ignorer',
        'Language': 'Langage',
        'Library': 'Bibliothèque',
        'Licenses': 'Licenses',
        'Logging': 'Journalisation',
        'Look and feel': 'Apparence',
        'Mopidy servers': 'Serveurs Mopidy',
        'Name': 'Nom',
        'No servers found': 'Aucun server trouvé',
        'Nothing playing': 'Rien à jouer',
        'OK': 'OK',
        'Path': 'Chemin',
        'Performer': 'Interprète',
        'Play next': 'Morceau suivant',
        'Play now': 'Jouer le morceau',
        'Playback': 'Playback',
        'Playlists': "Les listes d'écoute",
        'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.': "Veuillez vous assurer que Zeroconf est actionné sur tous les serveurs Mopidy du réseau local de votre appareil",
        'Port': 'Port',
        'Pull to refresh': 'Tirer pour mettre à jour',
        'Remove server': 'Supprimer le serveur',
        'Replace tracklist': 'Remplacer la liste des pistes',
        'Request timeout': 'Durée dépassée pour la requête',
        'Reset all settings to default values and restart application': "Remise à zéro des paramètres et redémarrage de l'application",
        'Reset': 'Remise à zéro',
        'Restart application': "Redémarrer l'application",
        'Restart': 'Redémarrer',
        'Retry': 'Recommencer',
        'Save as': 'Nouvelle sauvegarde',
        'Save': 'Sauvegarde',
        'Search here': 'Rechercher ici',
        'Search results': 'Rechercher les résultats',
        'Search term': 'Rechercher une expression',
        'Search {name}': 'Rechecher {name}',
        'Search': 'Rechercher',
        'Secure connection': 'Connection sécurisée',
        'ServerError': 'Erreur du Serveur',
        'Settings': 'Paramètres',
        'Share': 'Partage',
        'Show track info': 'Visonner les informations sur la piste',
        'Sort by name': 'Trier par nom',
        'Sort by scheme': 'Trier par genre',
        'Theme': 'Thème',
        'Then pull to refresh, or add a server manually.': "Tirer pour mettre à jour, ou ajouter le serveur manuellement",
        'TimeoutError': 'Erreur durée dépassée',
        'Track info': 'Information sur la piste',
        'Track number': 'Numéro de la piste',
        'Track': 'Piste',
        'Tracklist': 'Liste des pistes',
        'Translations': 'Traductions',
        'URI': 'URI',
        'URL': 'URL',
        'Volume keys': 'Touches du Volume',
        '{count} seconds': '{count, plural, one{1 second} other{# seconds}}',
        '{count} tracks': '{count, plural, =0{Pas de Piste} une{1 piste} other{# pistes}}',
        '{index} of {count}': '{index} parmi {count}',
      }
    });
  });
})(angular.module('app.locale.en', ['app.services.locale']));
