import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { ActionsService } from './actions.service';
import { CoverartService } from './coverart.service';
import { LoggingService } from './logging.service';
import { PreferencesService } from './preferences.service';
import { DEFAULT_SETTINGS, SettingsService } from './settings.service';
import { TranslateService } from './translate.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let connection: MockConnectionService;
  let actions: ActionsService;
  let coverart: CoverartService;
  let logging: LoggingService;
  let settings: SettingsService;
  let translate: TranslateService;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    localStorage.clear();
    document.documentElement.classList.remove('ion-palette-dark');
    connection = new MockConnectionService();
    TestBed.configureTestingModule({ providers: [provideMockConnection(connection)] });
    service = TestBed.inject(PreferencesService);
    actions = TestBed.inject(ActionsService);
    coverart = TestBed.inject(CoverartService);
    logging = TestBed.inject(LoggingService);
    settings = TestBed.inject(SettingsService);
    translate = TestBed.inject(TranslateService);
    vi.spyOn(coverart, 'use');
  });

  afterEach(() => {
    document.documentElement.classList.remove('ion-palette-dark');
    translate.use('en');
    vi.restoreAllMocks();
  });

  it('returns the stored settings', () => {
    expect(service.get()).toEqual(DEFAULT_SETTINGS);
    settings.extend({ locale: 'de' });
    expect(service.get().locale).toBe('de');
  });

  it('applies all stored settings', () => {
    settings.extend({
      action: 'add',
      coverart: ['lastfm', 'archive'],
      debug: true,
      locale: 'fr',
      theme: 'dark',
      timeout: 5000,
      volumestep: 3,
    });
    service.applyAll();
    expect(actions.getDefault()).toBe('add');
    expect(actions.getVolumeStep()).toBe(3);
    expect(connection.requestTimeout).toBe(5000);
    expect(coverart.use).toHaveBeenCalledWith(['lastfm', 'archive']);
    expect(logging.debugEnabled).toBe(true);
    expect(translate.current()).toBe('fr');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
  });

  it('applies defaults when nothing is stored', () => {
    service.applyAll();
    expect(actions.getDefault()).toBe('play');
    expect(connection.requestTimeout).toBe(15000);
    expect(coverart.use).toHaveBeenCalledWith(['mopidy']);
    expect(logging.debugEnabled).toBe(false);
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
  });

  it('sets and stores the default action', () => {
    service.setAction('replace');
    expect(actions.getDefault()).toBe('replace');
    expect(settings.get().action).toBe('replace');
  });

  it('sets and stores cover art providers', () => {
    service.setCoverart(['archive']);
    expect(coverart.use).toHaveBeenCalledWith(['archive']);
    expect(settings.get().coverart).toEqual(['archive']);
  });

  it('sets and stores debug logging', () => {
    service.setDebug(true);
    expect(logging.debugEnabled).toBe(true);
    expect(settings.get().debug).toBe(true);
  });

  it('sets and stores the locale', () => {
    service.setLocale('es');
    expect(translate.current()).toBe('es');
    expect(settings.get().locale).toBe('es');
  });

  it('sets and stores the theme', () => {
    service.setTheme('dark');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
    expect(settings.get().theme).toBe('dark');
    service.setTheme('light');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
    expect(settings.get().theme).toBe('light');
  });

  it('sets and stores the request timeout', () => {
    service.setTimeout(30000);
    expect(connection.requestTimeout).toBe(30000);
    expect(settings.get().timeout).toBe(30000);
  });

  it('sets and stores the volume step', () => {
    service.setVolumeStep(2);
    expect(actions.getVolumeStep()).toBe(2);
    expect(settings.get().volumestep).toBe(2);
  });
});
