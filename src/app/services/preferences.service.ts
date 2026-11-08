import { Injectable, inject } from '@angular/core';

import { ActionsService } from './actions.service';
import { ConnectionService } from './connection.service';
import { CoverartService } from './coverart.service';
import { LoggingService } from './logging.service';
import { Settings, SettingsService, Theme } from './settings.service';
import { TranslateService } from './translate.service';

/** Applies and persists user preferences. */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly actions = inject(ActionsService);
  private readonly connection = inject(ConnectionService);
  private readonly coverart = inject(CoverartService);
  private readonly logging = inject(LoggingService);
  private readonly settings = inject(SettingsService);
  private readonly translate = inject(TranslateService);

  get(): Settings {
    return this.settings.get();
  }

  /** Apply all stored preferences. */
  applyAll(): void {
    const obj = this.settings.get();
    this.actions.setDefault(obj.action);
    this.actions.setVolumeStep(obj.volumestep);
    this.connection.requestTimeout = obj.timeout;
    this.coverart.use(obj.coverart);
    this.logging.debugEnabled = obj.debug;
    this.translate.use(obj.locale);
    this.applyTheme(obj.theme);
  }

  setAction(action: string): void {
    this.actions.setDefault(action);
    this.settings.extend({ action });
  }

  setCoverart(coverart: string[]): void {
    this.coverart.use(coverart);
    this.settings.extend({ coverart });
  }

  setDebug(debug: boolean): void {
    this.logging.debugEnabled = debug;
    this.settings.extend({ debug });
  }

  setLocale(locale: string): void {
    this.translate.use(locale);
    this.settings.extend({ locale });
  }

  setTheme(theme: Theme): void {
    this.applyTheme(theme);
    this.settings.extend({ theme });
  }

  setTimeout(timeout: number): void {
    this.connection.requestTimeout = timeout;
    this.settings.extend({ timeout });
  }

  setVolumeStep(volumestep: number): void {
    this.actions.setVolumeStep(volumestep);
    this.settings.extend({ volumestep });
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle('ion-palette-dark', theme === 'dark');
  }
}
