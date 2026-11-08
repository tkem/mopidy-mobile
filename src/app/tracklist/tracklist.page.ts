import { Component, OnInit, inject } from '@angular/core';
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
  IonRefresher,
  IonRefresherContent,
  IonRouterLink,
  IonTitle,
  IonToolbar,
  PopoverController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { MenuService } from '../services/menu.service';
import { TracklistService } from '../services/tracklist.service';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe } from '../shared/pipes';
import { ThumbnailComponent } from '../shared/thumbnail.component';
import { showTracklistMenu } from './tracklist-menu.component';

@Component({
  selector: 'app-tracklist',
  imports: [
    ArtistsPipe,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRefresher,
    IonRefresherContent,
    IonRouterLink,
    IonTitle,
    IonToolbar,
    RouterLink,
    ThumbnailComponent,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          @if (tracklist.currentTlTrack()) {
            {{ '{index} of {count}' | translate: { index: tracklist.currentIndex() + 1, count: tracklist.tlTracks().length } }}
          } @else {
            {{ '{count} tracks' | translate: { count: tracklist.tlTracks().length } }}
          }
        </ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="edit" routerDirection="forward">
            <ion-icon slot="icon-only" name="pencil" />
          </ion-button>
          <ion-button (click)="showMenu($event)">
            <ion-icon slot="icon-only" name="ellipsis-vertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content [pullingText]="'Pull to refresh' | translate" />
      </ion-refresher>
      <ion-list class="app-long-list">
        @for (tlTrack of tracklist.tlTracks(); track tlTrack.tlid) {
          <ion-item
            button
            [detail]="false"
            [class.app-current]="tlTrack.tlid === tracklist.currentTlTrack()?.tlid"
            (click)="tracklist.play(tlTrack)"
          >
            <app-thumbnail slot="start" [image]="tracklist.images()[tlTrack.track.uri]" />
            <ion-label>
              <h2>{{ tlTrack.track.name || tlTrack.track.uri }}</h2>
              <h3>{{ tlTrack.track.artists | artists }}</h3>
              <p>{{ tlTrack.track.album?.name || tlTrack.track.genre || tlTrack.track.comment }}</p>
            </ion-label>
            <ion-button slot="end" fill="clear" color="medium" (click)="menu.trackInfo($event, tlTrack.track)">
              <ion-icon slot="icon-only" name="ellipsis-vertical" />
            </ion-button>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class TracklistPage implements OnInit {
  readonly tracklist = inject(TracklistService);
  readonly menu = inject(MenuService);

  private readonly popovers = inject(PopoverController);

  ngOnInit(): void {
    this.tracklist.start();
  }

  refresh(event: RefresherCustomEvent): void {
    this.tracklist.reload().finally(() => event.target.complete());
  }

  showMenu(event: Event): void {
    showTracklistMenu(this.popovers, event);
  }
}
