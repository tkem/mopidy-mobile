import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';

import { TranslatePipe } from '../services/translate.service';

@Component({
  selector: 'app-tabs',
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs, TranslatePipe],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="playback">
          <ion-icon name="musical-note" />
          <ion-label>{{ 'Playback' | translate }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="tracklist">
          <ion-icon name="list" />
          <ion-label>{{ 'Tracklist' | translate }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="library">
          <ion-icon name="home" />
          <ion-label>{{ 'Library' | translate }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="playlists">
          <ion-icon name="star" />
          <ion-label>{{ 'Playlists' | translate }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings">
          <ion-icon name="settings" />
          <ion-label>{{ 'Settings' | translate }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {}
