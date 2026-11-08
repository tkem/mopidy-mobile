import { Component, Input, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';

import { Ref } from '../models';
import { TranslatePipe } from '../services/translate.service';

/** Select a playlist; dismissed with the selected playlist's URI. */
@Component({
  selector: 'app-select-playlist',
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, TranslatePipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="danger" (click)="cancel()">{{ 'Cancel' | translate }}</ion-button>
        </ion-buttons>
        <ion-title>{{ 'Add to playlist' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (playlist of playlists; track playlist.uri) {
          <ion-item button [detail]="false" (click)="select(playlist)">
            <ion-label>{{ playlist.name || playlist.uri }}</ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class SelectPlaylistComponent {
  @Input() playlists: Ref[] = [];

  private readonly modalController = inject(ModalController);

  cancel(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  select(playlist: Ref): void {
    this.modalController.dismiss(playlist.uri, 'confirm');
  }
}
