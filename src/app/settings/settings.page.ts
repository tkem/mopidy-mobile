import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRouterLink,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { MenuService } from '../services/menu.service';
import { PlatformService } from '../services/platform.service';
import { PopupService } from '../services/popup.service';
import { SettingsService } from '../services/settings.service';
import { TranslatePipe } from '../services/translate.service';

@Component({
  selector: 'app-settings',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRouterLink,
    IonTitle,
    IonToolbar,
    RouterLink,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'Settings' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showMenu($event)">
            <ion-icon slot="icon-only" name="ellipsis-vertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @if (!platform.isHosted()) {
          <ion-item button [detail]="true" routerLink="servers">
            <ion-label>{{ 'Mopidy servers' | translate }}</ion-label>
          </ion-item>
        }
        <ion-item button [detail]="true" routerLink="ui">
          <ion-label>{{ 'Look and feel' | translate }}</ion-label>
        </ion-item>
        <ion-item button [detail]="true" routerLink="coverart">
          <ion-label>{{ 'Cover art' | translate }}</ion-label>
        </ion-item>
        <ion-item button [detail]="true" routerLink="logging">
          <ion-label>{{ 'Logging' | translate }}</ion-label>
        </ion-item>
        <ion-item button [detail]="true" routerLink="licenses">
          <ion-label>{{ 'Licenses' | translate }}</ion-label>
        </ion-item>
        <ion-item button [detail]="true" routerLink="about">
          <ion-label>{{ 'About' | translate }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
})
export class SettingsPage {
  readonly platform = inject(PlatformService);

  private readonly menu = inject(MenuService);
  private readonly popup = inject(PopupService);
  private readonly settings = inject(SettingsService);

  showMenu(event: Event): void {
    this.menu.show(event, [
      { text: 'Reset', hellip: true, handler: () => this.reset() },
      { text: 'Restart', handler: () => this.restart() },
      { text: 'Exit', hidden: !this.platform.isWebView(), handler: () => this.platform.exitApp() },
    ]);
  }

  async reset(): Promise<void> {
    if (await this.popup.confirm('Reset all settings to default values and restart application')) {
      this.settings.clear();
      await this.restart();
    }
  }

  async restart(): Promise<void> {
    try {
      (await this.platform.splashscreen()).show();
    } finally {
      window.location.reload();
    }
  }
}
