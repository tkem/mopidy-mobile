import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, SettingsService } from './settings.service';

const KEY = 'mopidy-mobile';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(SettingsService);
  });

  it('returns default settings when nothing is stored', () => {
    expect(service.get()).toEqual(DEFAULT_SETTINGS);
    expect(service.get()).not.toBe(DEFAULT_SETTINGS);
  });

  it('merges stored settings with defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ theme: 'dark', timeout: 5000 }));
    expect(service.get()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', timeout: 5000 });
  });

  it('extends and persists settings', () => {
    const result = service.extend({ locale: 'de' });
    expect(result.locale).toBe('de');
    expect(result.theme).toBe('light');
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ locale: 'de' });

    service.extend({ debug: true });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ locale: 'de', debug: true });
    expect(service.get()).toEqual({ ...DEFAULT_SETTINGS, locale: 'de', debug: true });
  });

  it('stores servers and the current server', () => {
    const server = { name: 'Test', url: 'ws://test:6680/mopidy/ws/' };
    service.extend({ servers: [server], server });
    expect(service.get().servers).toEqual([server]);
    expect(service.get().server).toEqual(server);
  });

  it('clears stored settings', () => {
    service.extend({ locale: 'de' });
    service.clear();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(service.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem(KEY, 'not json');
    expect(service.get()).toEqual(DEFAULT_SETTINGS);
    service.extend({ locale: 'fr' });
    expect(service.get().locale).toBe('fr');

    localStorage.setItem(KEY, 'null');
    expect(service.get()).toEqual(DEFAULT_SETTINGS);
  });

  describe('migrate', () => {
    it('moves pre-1.4 settings stored as separate keys', () => {
      localStorage.setItem(`${KEY}.action`, JSON.stringify('add'));
      localStorage.setItem(`${KEY}.locale`, JSON.stringify('nl'));
      localStorage.setItem(`${KEY}.servers`, JSON.stringify([{ name: 'A', url: 'ws://a/' }]));
      service.migrate();
      expect(localStorage.getItem(`${KEY}.action`)).toBeNull();
      expect(localStorage.getItem(`${KEY}.locale`)).toBeNull();
      expect(localStorage.getItem(`${KEY}.servers`)).toBeNull();
      const settings = service.get();
      expect(settings.action).toBe('add');
      expect(settings.locale).toBe('nl');
      expect(settings.servers).toEqual([{ name: 'A', url: 'ws://a/' }]);
    });

    it('converts the pre-2.0 stylesheet setting to a theme', () => {
      localStorage.setItem(KEY, JSON.stringify({ stylesheet: 'css/ionic-dark.min.css', locale: 'de' }));
      service.migrate();
      const stored = JSON.parse(localStorage.getItem(KEY)!);
      expect(stored).toEqual({ locale: 'de', theme: 'dark' });
      expect(service.get().theme).toBe('dark');
    });

    it('converts a separately stored light stylesheet', () => {
      localStorage.setItem(`${KEY}.stylesheet`, JSON.stringify('css/ionic-light.min.css'));
      service.migrate();
      expect(localStorage.getItem(`${KEY}.stylesheet`)).toBeNull();
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ theme: 'light' });
    });

    it('keeps an existing theme over the stylesheet', () => {
      localStorage.setItem(KEY, JSON.stringify({ stylesheet: 'css/ionic-dark.min.css', theme: 'light' }));
      service.migrate();
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ theme: 'light' });
    });

    it('drops invalid legacy values and is idempotent', () => {
      localStorage.setItem(`${KEY}.action`, 'not json');
      service.migrate();
      expect(localStorage.getItem(`${KEY}.action`)).toBeNull();
      expect(service.get()).toEqual(DEFAULT_SETTINGS);
      service.migrate();
      expect(service.get()).toEqual(DEFAULT_SETTINGS);
    });
  });
});
