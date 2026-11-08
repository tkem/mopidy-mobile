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

import { Track } from '../models';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe, DurationPipe } from './pipes';

/** Detailed track information. */
@Component({
  selector: 'app-track-info',
  imports: [
    ArtistsPipe,
    DurationPipe,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'Track info' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">{{ 'OK' | translate }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @if (track.name) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ track.name || track.uri }}</h2>
              <p>{{ 'Track' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.album?.name) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ track.album?.name }}</h2>
              <p>{{ 'Album' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.artists?.length) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ track.artists | artists }}</h2>
              <p>{{ 'Artist' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.composers?.length) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ track.composers | artists }}</h2>
              <p>{{ 'Composer' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.performers?.length) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ track.performers | artists }}</h2>
              <p>{{ 'Performer' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.album?.artists?.length) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ track.album?.artists | artists }}</h2>
              <p>{{ 'Album artist' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.track_no) {
          <ion-item>
            <ion-label>
              <h2>{{ track.track_no }}</h2>
              <p>{{ 'Track number' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.disc_no) {
          <ion-item>
            <ion-label>
              <h2>{{ track.disc_no }}</h2>
              <p>{{ 'Disc number' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.genre) {
          <ion-item>
            <ion-label>
              <h2>{{ track.genre }}</h2>
              <p>{{ 'Genre' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.date) {
          <ion-item>
            <ion-label>
              <h2>{{ track.date }}</h2>
              <p>{{ 'Date' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.length) {
          <ion-item>
            <ion-label>
              <h2>{{ track.length | duration }}</h2>
              <p>{{ 'Duration' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.bitrate) {
          <ion-item>
            <ion-label>
              <h2>{{ track.bitrate }}</h2>
              <p>{{ 'Bitrate' | translate }}</p>
            </ion-label>
          </ion-item>
        }
        @if (track.comment) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>{{ track.comment }}</h2>
              <p>{{ 'Comment' | translate }}</p>
            </ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class TrackInfoComponent {
  @Input() track!: Track;

  private readonly modalController = inject(ModalController);

  close(): void {
    this.modalController.dismiss();
  }
}
