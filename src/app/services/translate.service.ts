import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import MessageFormat from '@messageformat/core';

import { LOCALES, Locale } from '../locale';
import { LoggingService } from './logging.service';

type MessageFunction = (params?: Record<string, unknown>) => string;

function getLanguages(): readonly string[] {
  const navigator = window.navigator as Navigator & Record<string, unknown>;
  if (Array.isArray(navigator.languages) && navigator.languages.length) {
    return navigator.languages;
  }
  for (const name of ['language', 'browserLanguage', 'systemLanguage', 'userLanguage']) {
    const language = navigator[name];
    if (typeof language === 'string' && language.length) {
      return [language];
    }
  }
  return [];
}

/**
 * Translates user interface messages, using ICU MessageFormat syntax
 * for placeholders and plurals.
 */
@Injectable({ providedIn: 'root' })
export class TranslateService {
  readonly fallback = 'en';
  readonly locales: Readonly<Record<string, Locale>> = LOCALES;

  private readonly logging = inject(LoggingService);
  private readonly currentId = signal(this.fallback);
  private readonly formats = new Map<string, MessageFormat>();
  private readonly compiled = new Map<string, MessageFunction>();
  private readonly missing = new Set<string>();

  /** The current locale ID. */
  readonly current = this.currentId.asReadonly();

  /** Set the current locale; detect the preferred locale if empty. */
  use(id?: string | null): void {
    const locale = id && id in LOCALES ? id : this.detect();
    this.currentId.set(locale);
    document.documentElement.lang = LOCALES[locale].language;
  }

  instant(key: string, params?: Record<string, unknown>): string {
    const id = this.currentId();
    const locale = LOCALES[id];
    let message = locale.messages[key];
    if (message === undefined) {
      if (!this.missing.has(id + ':' + key)) {
        this.missing.add(id + ':' + key);
        this.logging.warn('Missing translation: ' + key);
      }
      message = key;
    }
    return this.compile(locale.language, message)(params ?? {});
  }

  private compile(language: string, message: string): MessageFunction {
    const key = language + '\u0000' + message;
    let fn = this.compiled.get(key);
    if (!fn) {
      try {
        let mf = this.formats.get(language);
        if (!mf) {
          mf = new MessageFormat(language);
          this.formats.set(language, mf);
        }
        fn = mf.compile(message) as MessageFunction;
      } catch (error) {
        this.logging.error('Invalid message: ' + message, error);
        fn = () => message;
      }
      this.compiled.set(key, fn);
    }
    return fn;
  }

  private detect(): string {
    const languages = getLanguages();
    this.logging.debug('Preferred languages: ' + languages);
    for (const language of languages) {
      const fields = language.toLowerCase().split(/[^a-z]/);
      for (let n = fields.length; n !== 0; --n) {
        const id = fields.slice(0, n).join('-');
        if (id in LOCALES) {
          this.logging.debug('Found matching locale: ' + id);
          return id;
        }
      }
    }
    this.logging.debug('Using fallback locale: ' + this.fallback);
    return this.fallback;
  }
}

@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(key: string | null | undefined, params?: Record<string, unknown>): string {
    return key == null ? '' : this.translate.instant(key, params);
  }
}
