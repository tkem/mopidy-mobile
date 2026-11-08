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
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';

import { MenuService } from '../services/menu.service';
import { PlaylistsService } from '../services/playlists.service';
import { TranslatePipe } from '../services/translate.service';
import { SchemePipe } from '../shared/pipes';
import { showPlaylistsMenu } from './playlists-menu';

@Component({
  selector: 'app-playlists-edit',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
    SchemePipe,
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
        <ion-title>{{ 'Edit playlists' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="create()">
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
        @for (playlist of playlists.sorted(); track playlist.uri) {
          <ion-item>
            <ion-button slot="start" fill="clear" color="danger" (click)="playlists.confirmDelete(playlist)">
              <ion-icon slot="icon-only" name="remove-circle" />
            </ion-button>
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
export class PlaylistsEditPage {
  readonly playlists = inject(PlaylistsService);

  private readonly menu = inject(MenuService);
  private readonly nav = inject(NavController);

  create(): void {
    this.nav.navigateForward(['/playlists/create']);
  }

  done(): void {
    this.nav.back();
  }

  showMenu(event: Event): void {
    showPlaylistsMenu(this.menu, this.playlists, event);
  }
}
