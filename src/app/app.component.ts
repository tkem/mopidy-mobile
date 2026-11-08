import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, IonSpinner, Platform } from '@ionic/angular/standalone';

import { LoadingService } from './services/loading.service';
import { PlatformService } from './services/platform.service';

/** Top-level pages, where the hardware back button exits the app. */
const ROOT_PAGES = new Set(['/servers', '/playback', '/tracklist', '/library', '/playlists', '/settings']);

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, IonSpinner],
  template: `
    <ion-app>
      <ion-router-outlet />
      @if (loading.active()) {
        <div class="app-loading">
          <div class="app-loading-indicator"><ion-spinner /></div>
        </div>
      }
    </ion-app>
  `,
})
export class AppComponent {
  readonly loading = inject(LoadingService);

  constructor() {
    const platform = inject(PlatformService);
    const router = inject(Router);
    // runs before Ionic's navigation handler (priority 0), but after
    // overlays such as modals and popovers (priority 100)
    inject(Platform).backButton.subscribeWithPriority(10, (processNextHandler) => {
      if (ROOT_PAGES.has(router.url.split(/[?#]/)[0])) {
        platform.exitApp();
      } else {
        processNextHandler();
      }
    });
  }
}
