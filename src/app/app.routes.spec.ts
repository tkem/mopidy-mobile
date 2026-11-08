import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routes } from './app.routes';
import { PlatformService } from './services/platform.service';

function paths(routes: Routes, prefix = ''): string[] {
  const result: string[] = [];
  for (const route of routes) {
    const path = route.path ? prefix + '/' + route.path : prefix;
    if (route.children) {
      result.push(...paths(route.children, path));
    } else {
      result.push(path || '/');
    }
  }
  return result;
}

describe('routes', () => {
  it('defines all application views', () => {
    expect(paths(routes).sort()).toEqual(
      [
        '/',
        '/**',
        '/library',
        '/library/browse/:uri',
        '/library/lookup/:uri',
        '/library/query',
        '/library/search',
        '/playback',
        '/playlists',
        '/playlists/:uri',
        '/playlists/:uri/edit',
        '/playlists/create',
        '/playlists/edit',
        '/servers',
        '/servers/add',
        '/servers/edit',
        '/settings',
        '/settings/about',
        '/settings/coverart',
        '/settings/licenses',
        '/settings/logging',
        '/settings/servers',
        '/settings/servers/add',
        '/settings/servers/edit',
        '/settings/ui',
        '/tracklist',
        '/tracklist/edit',
      ].sort(),
    );
  });

  it('lazily loads a component for every view', () => {
    const check = (routes: Routes) => {
      for (const route of routes) {
        if (route.children) {
          check(route.children);
        } else {
          expect(route.loadComponent || route.redirectTo !== undefined, route.path).toBeTruthy();
        }
      }
    };
    check(routes);
  });

  describe('default route', () => {
    let isHosted: boolean;

    beforeEach(() => {
      isHosted = false;
      TestBed.configureTestingModule({
        providers: [
          provideRouter(routes),
          { provide: PlatformService, useValue: { isHosted: vi.fn(() => isHosted) } },
        ],
      });
    });

    it('shows the server list in the app', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/');
      expect(router.url).toBe('/servers');
    });

    it('shows the playback view when hosted by a Mopidy server', async () => {
      isHosted = true;
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/');
      expect(router.url).toBe('/playback');
    });

    it('redirects unknown URLs to the default route', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/no/such/page');
      expect(router.url).toBe('/servers');
      isHosted = true;
      await router.navigateByUrl('/other/page');
      expect(router.url).toBe('/playback');
    });
  });
});
