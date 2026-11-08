import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  NavController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { Image, Model, Track } from '../models';
import { ActionsService } from '../services/actions.service';
import { ConnectionService } from '../services/connection.service';
import { DetailsService } from '../services/details.service';
import { LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe } from '../shared/pipes';
import { ThumbnailComponent } from '../shared/thumbnail.component';

@Component({
  selector: 'app-playlist',
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
          <ion-back-button defaultHref="/playlists" [text]="'Back' | translate" />
        </ion-buttons>
        <ion-title>{{ name() || uri }}</ion-title>
        <ion-buttons slot="end">
          <ion-button [disabled]="!items().length" (click)="actions.default(items())">
            <ion-icon slot="icon-only" name="play" />
          </ion-button>
          @if (editable()) {
            <ion-button (click)="edit()">
              <ion-icon slot="icon-only" name="pencil" />
            </ion-button>
          }
          <ion-button (click)="menu.tracks($event, items())">
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
        @for (item of items(); track $index) {
          <ion-item button [detail]="false" (click)="actions.default(item)">
            <app-thumbnail slot="start" [image]="images()[item.uri]" />
            <ion-label>
              <h2>{{ item.name || item.uri }}</h2>
              <h3>{{ item.artists | artists }}</h3>
              <p>{{ item.album?.name || item.genre || item.comment }}</p>
            </ion-label>
            <ion-button slot="end" fill="clear" color="medium" (click)="menu.playlistItem($event, item)">
              <ion-icon slot="icon-only" name="ellipsis-vertical" />
            </ion-button>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class PlaylistPage implements OnInit {
  readonly actions = inject(ActionsService);
  readonly menu = inject(MenuService);

  private readonly connection = inject(ConnectionService);
  private readonly details = inject(DetailsService);
  private readonly logging = inject(LoggingService);
  private readonly nav = inject(NavController);
  private readonly route = inject(ActivatedRoute);

  readonly name = signal<string | null>(null);
  readonly editable = signal(false);
  readonly items = signal<Model[]>([]);
  readonly images = signal<Record<string, Image | null>>({});

  uri = '';

  private abort: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.abort?.abort());
    this.connection
      .on<{ playlist: { uri: string; name: string } }>('event:playlistChanged')
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        if (data.playlist?.uri === this.uri) {
          this.name.set(data.playlist.name);
          this.reload();
        }
      });
    this.connection
      .on('state:online')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  ngOnInit(): void {
    this.uri = this.route.snapshot.paramMap.get('uri') || '';
    this.name.set(this.route.snapshot.queryParamMap.get('name'));
    this.connection
      .call((mopidy) => Promise.all([mopidy.playlists.editable, mopidy.playlists.getItems({ uri: this.uri })]))
      .then(([editable, items]) => {
        this.editable.set(!!editable);
        this.setItems(items || []);
      })
      .catch((error) => this.logging.warn('Error loading playlist ' + this.uri, error));
  }

  edit(): void {
    this.nav.navigateForward(['/playlists', this.uri, 'edit'], { queryParams: { name: this.name() } });
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      await mopidy.playlists.refresh({ uri_scheme: this.uri.substring(0, this.uri.indexOf(':')) });
      await this.reload();
    } catch (error) {
      this.logging.warn('Error refreshing playlist ' + this.uri, error);
    } finally {
      event.target.complete();
    }
  }

  async reload(): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      this.setItems((await mopidy.playlists.getItems({ uri: this.uri })) || []);
    } catch (error) {
      this.logging.warn('Error loading playlist ' + this.uri, error);
    }
  }

  private setItems(items: Model[]): void {
    this.items.set(items);
    this.abort?.abort();
    this.abort = new AbortController();
    this.details.load(
      items,
      {
        tracks: (tracks: Record<string, Track>) =>
          this.items.update((items) => items.map((item) => tracks[item.uri] || item)),
        images: (images) => this.images.update((obj) => ({ ...obj, ...images })),
      },
      this.abort.signal,
    );
  }
}
