import { Injectable, inject } from '@angular/core';

import { ActionsService } from './services/actions.service';
import { ConnectionService } from './services/connection.service';
import { LoggingService } from './services/logging.service';
import { PlatformService } from './services/platform.service';
import { PreferencesService } from './services/preferences.service';
import { SettingsService } from './services/settings.service';

/** Application initialization. */
@Injectable({ providedIn: 'root' })
export class StartupService {
  private readonly actions = inject(ActionsService);
  private readonly connection = inject(ConnectionService);
  private readonly logging = inject(LoggingService);
  private readonly platform = inject(PlatformService);
  private readonly preferences = inject(PreferencesService);
  private readonly settings = inject(SettingsService);

  init(): void {
    this.settings.migrate();
    this.preferences.applyAll();

    if (this.platform.isWebView()) {
      this.platform.addEventListener('volumeupbutton', () => this.actions.increaseVolume());
      this.platform.addEventListener('volumedownbutton', () => this.actions.decreaseVolume());
    }

    if (this.platform.isHosted()) {
      // connect to the hosting server, or the configured WebSocket URL
      this.connection.reset(this.platform.webSocketUrl());
    }

    this.platform.appVersion().then((version) => {
      this.logging.info('Starting Mopidy Mobile ' + version);
      this.platform.version.set(version);
    });
  }
}
