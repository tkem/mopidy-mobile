import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { PlatformService } from './services/platform.service';

/** The default view: the playback view when hosted by a Mopidy server, the server list otherwise. */
function defaultRoute(): string {
  return inject(PlatformService).isHosted() ? '/playback' : '/servers';
}

const serverRoutes: Routes = [
  { path: '', loadComponent: () => import('./servers/servers.page').then((m) => m.ServersPage) },
  { path: 'add', loadComponent: () => import('./servers/servers-add.page').then((m) => m.ServersAddPage) },
  { path: 'edit', loadComponent: () => import('./servers/servers-edit.page').then((m) => m.ServersEditPage) },
];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: defaultRoute,
  },
  {
    path: 'servers',
    children: serverRoutes,
  },
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'playback',
        loadComponent: () => import('./playback/playback.page').then((m) => m.PlaybackPage),
      },
      {
        path: 'tracklist',
        children: [
          { path: '', loadComponent: () => import('./tracklist/tracklist.page').then((m) => m.TracklistPage) },
          {
            path: 'edit',
            loadComponent: () => import('./tracklist/tracklist-edit.page').then((m) => m.TracklistEditPage),
          },
        ],
      },
      {
        path: 'library',
        children: [
          { path: '', loadComponent: () => import('./library/browse.page').then((m) => m.BrowsePage) },
          { path: 'browse/:uri', loadComponent: () => import('./library/browse.page').then((m) => m.BrowsePage) },
          { path: 'lookup/:uri', loadComponent: () => import('./library/lookup.page').then((m) => m.LookupPage) },
          { path: 'query', loadComponent: () => import('./library/query.page').then((m) => m.QueryPage) },
          { path: 'search', loadComponent: () => import('./library/search.page').then((m) => m.SearchPage) },
        ],
      },
      {
        path: 'playlists',
        children: [
          { path: '', loadComponent: () => import('./playlists/playlists.page').then((m) => m.PlaylistsPage) },
          {
            path: 'edit',
            loadComponent: () => import('./playlists/playlists-edit.page').then((m) => m.PlaylistsEditPage),
          },
          {
            path: 'create',
            loadComponent: () => import('./playlists/playlist-edit.page').then((m) => m.PlaylistEditPage),
          },
          { path: ':uri', loadComponent: () => import('./playlists/playlist.page').then((m) => m.PlaylistPage) },
          {
            path: ':uri/edit',
            loadComponent: () => import('./playlists/playlist-edit.page').then((m) => m.PlaylistEditPage),
          },
        ],
      },
      {
        path: 'settings',
        children: [
          { path: '', loadComponent: () => import('./settings/settings.page').then((m) => m.SettingsPage) },
          { path: 'ui', loadComponent: () => import('./settings/ui.page').then((m) => m.UiPage) },
          { path: 'coverart', loadComponent: () => import('./settings/coverart.page').then((m) => m.CoverartPage) },
          { path: 'logging', loadComponent: () => import('./settings/logging.page').then((m) => m.LoggingPage) },
          { path: 'licenses', loadComponent: () => import('./settings/licenses.page').then((m) => m.LicensesPage) },
          { path: 'about', loadComponent: () => import('./settings/about.page').then((m) => m.AboutPage) },
          { path: 'servers', children: serverRoutes },
        ],
      },
    ],
  },
  { path: '**', redirectTo: defaultRoute },
];
