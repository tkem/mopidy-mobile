import { Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToggleCustomEvent,
} from '@ionic/angular/standalone';

import { CoverartService } from '../services/coverart.service';
import { MenuService } from '../services/menu.service';
import { PreferencesService } from '../services/preferences.service';
import { TranslatePipe } from '../services/translate.service';
import { ExternalLinkDirective } from '../shared/external-link.directive';

interface Provider {
  id: string;
  name: string;
  url: string;
  image: string;
}

@Component({
  selector: 'app-settings-coverart',
  imports: [
    ExternalLinkDirective,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonTitle,
    IonToggle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings" [text]="'Back' | translate" />
        </ion-buttons>
        <ion-title>{{ 'Cover art' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showMenu($event)">
            <ion-icon slot="icon-only" name="ellipsis-vertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (provider of providers; track provider.id) {
          <ion-item>
            <a slot="start" [appExternal]="provider.url">
              <img class="logo" [src]="provider.image" [alt]="provider.name" />
            </a>
            <ion-toggle
              [attr.aria-label]="provider.name"
              [checked]="enabled.includes(provider.id)"
              (ionChange)="toggle(provider.id, $event)"
            />
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: `
    img.logo {
      height: 32px;
      vertical-align: middle;
    }
    ion-toggle {
      margin-left: auto;
    }
  `,
})
export class CoverartPage {
  readonly providers: Provider[] = [
    { id: 'mopidy', name: 'Mopidy', url: 'https://mopidy.com/', image: 'assets/mopidy.png' },
    { id: 'lastfm', name: 'Last.fm', url: 'https://www.last.fm/', image: 'assets/lastfm.gif' },
    { id: 'archive', name: 'Cover Art Archive', url: 'https://coverartarchive.org/', image: 'assets/coverartarchive.svg' },
  ];

  private readonly coverart = inject(CoverartService);
  private readonly menu = inject(MenuService);
  private readonly preferences = inject(PreferencesService);

  enabled = this.preferences.get().coverart;

  toggle(id: string, event: Event): void {
    const checked = (event as ToggleCustomEvent).detail.checked;
    // keep the order of providers
    this.enabled = this.providers
      .map((provider) => provider.id)
      .filter((name) => (name === id ? checked : this.enabled.includes(name)));
    this.preferences.setCoverart(this.enabled);
  }

  showMenu(event: Event): void {
    this.menu.show(event, [{ text: 'Clear cache', handler: () => this.coverart.clearCache() }]);
  }
}
