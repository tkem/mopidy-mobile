import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
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
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { Image, Track } from '../models';
import { ActionsService } from '../services/actions.service';
import { ConnectionService } from '../services/connection.service';
import { DetailsService } from '../services/details.service';
import { LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe } from '../shared/pipes';
import { ThumbnailComponent } from '../shared/thumbnail.component';

@Component({
  selector: 'app-library-lookup',
  imports: [
    ArtistsPipe,
    IonBackButton,
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
    IonTitle,
    IonToolbar,
    ThumbnailComponent,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/library" [text]="'Back' | translate" />
        </ion-buttons>
        <ion-title>{{ name || ('Library' | translate) }}</ion-title>
        <ion-buttons slot="end">
          <ion-button [disabled]="!tracks().length" (click)="actions.default(tracks())">
            <ion-icon slot="icon-only" name="play" />
          </ion-button>
          <ion-button (click)="menu.tracks($event, tracks())">
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
        @for (track of tracks(); track $index) {
          <ion-item button [detail]="false" (click)="actions.default(track)">
            <app-thumbnail slot="start" [image]="images()[track.uri]" />
            <ion-label>
              <h2>{{ track.name || track.uri }}</h2>
              <h3>{{ track.artists | artists }}</h3>
              <p>{{ track.album?.name || track.genre || track.comment }}</p>
            </ion-label>
            <ion-button slot="end" fill="clear" color="medium" (click)="menu.track($event, track)">
              <ion-icon slot="icon-only" name="ellipsis-vertical" />
            </ion-button>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class LookupPage implements OnInit {
  readonly actions = inject(ActionsService);
  readonly menu = inject(MenuService);

  private readonly connection = inject(ConnectionService);
  private readonly details = inject(DetailsService);
  private readonly logging = inject(LoggingService);
  private readonly route = inject(ActivatedRoute);

  readonly tracks = signal<Track[]>([]);
  readonly images = signal<Record<string, Image | null>>({});

  uri = '';
  name: string | null = null;

  private abort: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.abort?.abort());
  }

  ngOnInit(): void {
    this.uri = this.route.snapshot.paramMap.get('uri') || '';
    this.name = this.route.snapshot.queryParamMap.get('name');
    this.connection
      .call((mopidy) => mopidy.library.lookup({ uris: [this.uri] }))
      .then((result) => this.setTracks(result[this.uri] || []))
      .catch((error) => this.logging.warn('Error looking up ' + this.uri, error));
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      await mopidy.library.refresh({ uri: this.uri });
      const result = await mopidy.library.lookup({ uris: [this.uri] });
      this.setTracks(result[this.uri] || []);
    } catch (error) {
      this.logging.warn('Error refreshing ' + this.uri, error);
    } finally {
      event.target.complete();
    }
  }

  private setTracks(tracks: Track[]): void {
    this.tracks.set(tracks);
    this.abort?.abort();
    this.abort = new AbortController();
    const images = this.images();
    this.details.load(
      tracks.filter((track) => !(track.uri in images)),
      { images: (images) => this.images.update((obj) => ({ ...obj, ...images })) },
      this.abort.signal,
    );
  }
}
