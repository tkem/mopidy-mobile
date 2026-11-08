import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCALES } from '../locale';
import { LoggingService } from './logging.service';
import { TranslatePipe, TranslateService } from './translate.service';

function setLanguages(languages: string[]): void {
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true });
}

describe('TranslateService', () => {
  let service: TranslateService;
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    service = TestBed.inject(TranslateService);
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    vi.spyOn(logging, 'error');
  });

  afterEach(() => {
    delete (window.navigator as unknown as Record<string, unknown>)['languages'];
    document.documentElement.lang = 'en';
    vi.restoreAllMocks();
  });

  it('defaults to English', () => {
    expect(service.current()).toBe('en');
    expect(service.instant('Playback')).toBe('Playback');
  });

  it('translates messages in the current locale', () => {
    service.use('de');
    expect(service.current()).toBe('de');
    expect(service.instant('Playback')).toBe(LOCALES['de'].messages['Playback']);
    expect(document.documentElement.lang).toBe('de');
  });

  it('formats placeholders and plurals', () => {
    expect(service.instant('{index} of {count}', { index: 2, count: 5 })).toBe('2 of 5');
    expect(service.instant('{count} tracks', { count: 0 })).toBe('No tracks');
    expect(service.instant('{count} tracks', { count: 1 })).toBe('1 track');
    expect(service.instant('{count} tracks', { count: 3 })).toBe('3 tracks');
    expect(service.instant('{count} seconds', { count: 1 })).toBe('1 second');
    expect(service.instant('{count} seconds', { count: 30 })).toBe('30 seconds');
  });

  it('returns the key for missing translations, warning only once', () => {
    expect(service.instant('No such message')).toBe('No such message');
    expect(service.instant('No such message')).toBe('No such message');
    expect(logging.warn).toHaveBeenCalledTimes(1);
    expect(logging.warn).toHaveBeenCalledWith('Missing translation: No such message');
  });

  it('falls back to the raw message for invalid formats', () => {
    expect(service.instant('{broken')).toBe('{broken');
    expect(logging.error).toHaveBeenCalled();
  });

  it('detects the preferred locale from the browser languages', () => {
    setLanguages(['pt-BR', 'fr-CA', 'en']);
    service.use('');
    expect(service.current()).toBe('fr');
  });

  it('matches regional variants to the base language', () => {
    setLanguages(['de_AT']);
    service.use(null);
    expect(service.current()).toBe('de');
  });

  it('uses the fallback for unsupported languages', () => {
    service.use('de');
    setLanguages(['xx', 'yy-ZZ']);
    service.use(undefined);
    expect(service.current()).toBe('en');
  });

  it('ignores unknown locale IDs', () => {
    setLanguages(['nb-NO']);
    service.use('klingon');
    expect(service.current()).toBe('nb');
  });

  it('exposes all locales', () => {
    expect(Object.keys(service.locales).sort()).toEqual(['ca', 'de', 'en', 'es', 'fr', 'nb', 'nl', 'pl', 'sk']);
  });
});

describe('TranslatePipe', () => {
  it('translates keys with parameters', () => {
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    TestBed.inject(TranslateService).use('en');
    expect(pipe.transform('Playback')).toBe('Playback');
    expect(pipe.transform('{count} tracks', { count: 2 })).toBe('2 tracks');
  });

  it('returns an empty string for missing keys', () => {
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});

describe('locales', () => {
  const keys = Object.keys(LOCALES['en'].messages).sort();

  for (const [id, locale] of Object.entries(LOCALES)) {
    it(`"${id}" declares its language and display name`, () => {
      expect(locale.language).toBe(id);
      expect(locale.displayName.length).toBeGreaterThan(0);
    });

    it(`"${id}" translates the same messages as "en"`, () => {
      expect(Object.keys(locale.messages).sort()).toEqual(keys);
    });

    it(`"${id}" uses the placeholders of the English messages`, () => {
      // named arguments, i.e. "{name}" or "{count, plural, ...}", but not
      // plural branches such as "other{# tracks}" or "=0{none}"
      const placeholders = (message: string) =>
        Array.from(
          message.matchAll(/(?<![\p{L}\p{N}_=])\{\s*([\p{L}_][\p{L}\p{N}_]*)\s*[,}]/gu),
          (match) => match[1],
        ).sort();
      for (const key of keys) {
        expect(placeholders(locale.messages[key]), `${id}: "${key}"`).toEqual(placeholders(key));
      }
    });
  }
});
