import { Injectable } from '@angular/core';

export interface Server {
  name: string;
  url: string;
  auto?: boolean;
}

export type Theme = 'light' | 'dark';

export interface Settings {
  action: string;
  coverart: string[];
  debug: boolean;
  locale: string;
  server: Server | null;
  servers: Server[];
  theme: Theme;
  timeout: number;
  volumestep: number;
}

export const DEFAULT_SETTINGS: Settings = {
  action: 'play',
  coverart: ['mopidy'],
  debug: false,
  locale: '',
  server: null,
  servers: [],
  theme: 'light',
  timeout: 15000,
  volumestep: 10,
};

const KEY = 'mopidy-mobile';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Persistent user settings, stored as a single JSON object. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = getStorage();

  get(): Settings {
    return { ...DEFAULT_SETTINGS, ...this.read() };
  }

  extend(src: Partial<Settings>): Settings {
    const obj = { ...this.read(), ...src };
    this.write(obj);
    return { ...DEFAULT_SETTINGS, ...obj };
  }

  clear(): void {
    this.storage?.removeItem(KEY);
  }

  /** Migrate settings stored by previous versions. */
  migrate(): void {
    const storage = this.storage;
    if (!storage) {
      return;
    }
    // pre-1.4 settings were stored as separate keys
    for (const item of ['action', 'locale', 'servers', 'stylesheet']) {
      const key = `${KEY}.${item}`;
      const value = storage.getItem(key);
      if (value !== null) {
        try {
          this.write({ ...this.read(), [item]: JSON.parse(value) });
        } catch {
          // ignore invalid values
        }
        storage.removeItem(key);
      }
    }
    // pre-2.0 settings stored the theme as a stylesheet URL
    const obj = this.read();
    const stylesheet = obj['stylesheet'];
    if (typeof stylesheet === 'string') {
      if (!obj['theme']) {
        obj['theme'] = stylesheet.includes('dark') ? 'dark' : 'light';
      }
      delete obj['stylesheet'];
      this.write(obj);
    }
  }

  private read(): Record<string, unknown> {
    try {
      return JSON.parse(this.storage?.getItem(KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  private write(obj: Record<string, unknown>): void {
    this.storage?.setItem(KEY, JSON.stringify(obj));
  }
}
