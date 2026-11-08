import { Component, inject } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { PlatformService } from '../services/platform.service';
import { TranslatePipe } from '../services/translate.service';
import { ExternalLinkDirective } from '../shared/external-link.directive';

@Component({
  selector: 'app-settings-about',
  imports: [ExternalLinkDirective, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, TranslatePipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings" [text]="'Back' | translate" />
        </ion-buttons>
        <ion-title>{{ 'About' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="about">
        <img src="assets/icon.png" alt="" />
        <div>
          <h1>Mopidy Mobile {{ platform.version() }}</h1>
          <a appExternal="https://github.com/tkem/mopidy-mobile">https://github.com/tkem/mopidy-mobile</a>
        </div>
      </div>

      <p>Copyright &copy; 2015-2025 Thomas Kemmer.</p>

      <p>
        Licensed under the
        <a appExternal="https://github.com/tkem/mopidy-mobile/blob/master/LICENSE">Apache License, Version 2.0</a>.
      </p>

      <p>
        {{ 'Translations' | translate }}:
        <a appExternal="https://github.com/slimer/">slimer</a> (Español, Català),
        <a appExternal="https://github.com/araczkowski/">Andrzej Raczkowski</a> (Polski),
        <a appExternal="mailto:kuderjavy@gmail.com">Peter Kuderjavy</a> (Slovak),
        <a appExternal="https://github.com/gbrault">Gilbert Brault</a> (Français),
        <a appExternal="https://github.com/70MM13">wimpie</a> (Nederlands),
        <a appExternal="mailto:tom.aurlund@gmail.com">Tom Aurlund</a> (Norsk Bokmål).
      </p>
    </ion-content>
  `,
  styles: `
    .about {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }
    .about img {
      width: 64px;
      height: 64px;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 22px;
    }
  `,
})
export class AboutPage {
  readonly platform = inject(PlatformService);
}
