import { Component, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonReorder,
  IonReorderGroup,
  IonTitle,
  IonToolbar,
  ItemReorderEventDetail,
  NavController,
  PopoverController,
} from '@ionic/angular/standalone';

import { PopupService } from '../services/popup.service';
import { TracklistService } from '../services/tracklist.service';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe } from '../shared/pipes';
import { ThumbnailComponent } from '../shared/thumbnail.component';
import { showTracklistMenu } from './tracklist-menu.component';

@Component({
  selector: 'app-tracklist-edit',
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
    IonReorder,
    IonReorderGroup,
    IonTitle,
    IonToolbar,
    ThumbnailComponent,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="done()">
            <ion-icon slot="start" name="checkmark" />
            {{ 'Done' | translate }}
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'Edit tracklist' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="addStream()">
            <ion-icon slot="icon-only" name="create" />
          </ion-button>
          <ion-button (click)="showMenu($event)">
            <ion-icon slot="icon-only" name="ellipsis-vertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-reorder-group [disabled]="false" (ionItemReorder)="reorder($event)">
          @for (tlTrack of tracklist.tlTracks(); track tlTrack.tlid) {
            <ion-item [class.app-current]="tlTrack.tlid === tracklist.currentTlTrack()?.tlid">
              <ion-button slot="start" fill="clear" color="danger" (click)="tracklist.remove(tlTrack)">
                <ion-icon slot="icon-only" name="remove-circle" />
              </ion-button>
              <app-thumbnail slot="start" [image]="tracklist.images()[tlTrack.track.uri]" />
              <ion-label>
                <h2>{{ tlTrack.track.name || tlTrack.track.uri }}</h2>
                <h3>{{ tlTrack.track.artists | artists }}</h3>
                <p>{{ tlTrack.track.album?.name || tlTrack.track.genre || tlTrack.track.comment }}</p>
              </ion-label>
              <ion-reorder slot="end" />
            </ion-item>
          }
        </ion-reorder-group>
      </ion-list>
    </ion-content>
  `,
})
export class TracklistEditPage {
  readonly tracklist = inject(TracklistService);

  private readonly nav = inject(NavController);
  private readonly popovers = inject(PopoverController);
  private readonly popup = inject(PopupService);

  done(): void {
    this.nav.back();
  }

  async addStream(): Promise<void> {
    const stream = await this.popup.addStream(false);
    if (stream) {
      await this.tracklist.add(stream.uri);
    }
  }

  reorder(event: CustomEvent<ItemReorderEventDetail>): void {
    const { from, to } = event.detail;
    // let Angular update the DOM
    event.detail.complete(false);
    if (from !== to) {
      this.tracklist.move(from, to);
    }
  }

  showMenu(event: Event): void {
    showTracklistMenu(this.popovers, event);
  }
}
