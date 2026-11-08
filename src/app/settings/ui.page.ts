import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { PlatformService } from '../services/platform.service';
import { PreferencesService } from '../services/preferences.service';
import { Theme } from '../services/settings.service';
import { TranslatePipe, TranslateService } from '../services/translate.service';

@Component({
  selector: 'app-settings-ui',
  imports: [
    FormsModule,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonList,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings" [text]="'Back' | translate" />
        </ion-buttons>
        <ion-title>{{ 'Look and feel' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-select
            interface="popover"
            [label]="'Language' | translate"
            [ngModel]="settings.locale"
            (ngModelChange)="preferences.setLocale($event)"
          >
            <ion-select-option value="">{{ 'Default' | translate }}</ion-select-option>
            @for (locale of locales; track locale.id) {
              <ion-select-option [value]="locale.id">{{ locale.displayName }}</ion-select-option>
            }
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select
            interface="popover"
            [label]="'Theme' | translate"
            [ngModel]="settings.theme"
            (ngModelChange)="setTheme($event)"
          >
            <ion-select-option value="light">Light</ion-select-option>
            <ion-select-option value="dark">Dark</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select
            interface="popover"
            [label]="'Default click action' | translate"
            [ngModel]="settings.action"
            (ngModelChange)="preferences.setAction($event)"
          >
            <ion-select-option value="play">{{ 'Play now' | translate }}</ion-select-option>
            <ion-select-option value="next">{{ 'Play next' | translate }}</ion-select-option>
            <ion-select-option value="add">{{ 'Add to tracklist' | translate }}</ion-select-option>
            <ion-select-option value="replace">{{ 'Replace tracklist' | translate }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select
            interface="popover"
            [label]="'Request timeout' | translate"
            [ngModel]="settings.timeout"
            (ngModelChange)="preferences.setTimeout($event)"
          >
            @for (seconds of timeouts; track seconds) {
              <ion-select-option [value]="seconds * 1000">
                {{ '{count} seconds' | translate: { count: seconds } }}
              </ion-select-option>
            }
          </ion-select>
        </ion-item>
        @if (platform.isWebView()) {
          <ion-item>
            <ion-select
              interface="popover"
              [label]="'Volume keys' | translate"
              [ngModel]="settings.volumestep"
              (ngModelChange)="preferences.setVolumeStep($event)"
            >
              @for (step of volumeSteps; track step) {
                <ion-select-option [value]="step">&plusmn;{{ step }}%</ion-select-option>
              }
            </ion-select>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class UiPage {
  readonly platform = inject(PlatformService);
  readonly preferences = inject(PreferencesService);
  readonly settings = this.preferences.get();
  readonly locales = Object.entries(inject(TranslateService).locales).map(([id, locale]) => ({ id, ...locale }));
  readonly timeouts = [5, 10, 15, 30, 60];
  readonly volumeSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  setTheme(theme: Theme): void {
    this.preferences.setTheme(theme);
  }
}
