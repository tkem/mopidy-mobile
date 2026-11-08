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
  NavController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { Ref } from '../models';
import { LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { PlaylistsService } from '../services/playlists.service';
import { TranslatePipe } from '../services/translate.service';
import { SchemePipe } from '../shared/pipes';
import { showPlaylistsMenu } from './playlists-menu';

@Component({
  selector: 'app-playlists',
  imports: [
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
    SchemePipe,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'Playlists' | translate }}</ion-title>
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
        @for (playlist of playlists.sorted(); track playlist.uri) {
          <ion-item button [detail]="true" (click)="open(playlist)">
            <ion-label>
              <h2>{{ playlist.name || playlist.uri }}</h2>
              <p>{{ playlist.uri | scheme }}</p>
            </ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class PlaylistsPage implements OnInit {
  readonly playlists = inject(PlaylistsService);

  private readonly logging = inject(LoggingService);
  private readonly menu = inject(MenuService);
  private readonly nav = inject(NavController);

  ngOnInit(): void {
    this.playlists.start();
  }

  open(playlist: Ref): void {
    this.nav.navigateForward(['/playlists', playlist.uri], { queryParams: { name: playlist.name } });
  }

  refresh(event: RefresherCustomEvent): void {
    this.playlists
      .refresh()
      .catch((error) => this.logging.warn('Error refreshing playlists', error))
      .finally(() => event.target.complete());
  }

  showMenu(event: Event): void {
    showPlaylistsMenu(this.menu, this.playlists, event);
  }
}
