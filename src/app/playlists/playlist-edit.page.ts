import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonReorder,
  IonReorderGroup,
  IonTitle,
  IonToolbar,
  ItemReorderEventDetail,
  NavController,
} from '@ionic/angular/standalone';

import { Model } from '../models';
import { ConnectionService } from '../services/connection.service';
import { LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { PlaylistsService } from '../services/playlists.service';
import { PopupService } from '../services/popup.service';
import { TranslatePipe } from '../services/translate.service';

@Component({
  selector: 'app-playlist-edit',
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonReorder,
    IonReorderGroup,
    IonTitle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="saveAndClose()">
            <ion-icon slot="start" name="checkmark" />
            {{ 'Save' | translate }}
          </ion-button>
        </ion-buttons>
        <ion-title>{{ (uri ? 'Edit playlist' : 'Create playlist') | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close" />
          </ion-button>
          <ion-button (click)="addStream()">
            <ion-icon slot="icon-only" name="create" />
          </ion-button>
          <ion-button (click)="menu.tracks($event, items())">
            <ion-icon slot="icon-only" name="ellipsis-vertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form (ngSubmit)="saveAndClose()">
        <ion-list>
          <ion-item>
            <ion-input name="name" aria-label="Name" [(ngModel)]="name" [placeholder]="'Name' | translate" />
          </ion-item>
        </ion-list>
      </form>
      <ion-list>
        <ion-reorder-group [disabled]="false" (ionItemReorder)="reorder($event)">
          @for (item of items(); track $index) {
            <ion-item>
              <ion-button slot="start" fill="clear" color="danger" (click)="remove($index)">
                <ion-icon slot="icon-only" name="remove-circle" />
              </ion-button>
              <ion-label>{{ item.name || item.uri }}</ion-label>
              <ion-reorder slot="end" />
            </ion-item>
          }
        </ion-reorder-group>
      </ion-list>
    </ion-content>
  `,
})
export class PlaylistEditPage implements OnInit {
  readonly menu = inject(MenuService);

  private readonly connection = inject(ConnectionService);
  private readonly logging = inject(LoggingService);
  private readonly nav = inject(NavController);
  private readonly playlists = inject(PlaylistsService);
  private readonly popup = inject(PopupService);
  private readonly route = inject(ActivatedRoute);

  readonly items = signal<Model[]>([]);

  uri: string | null = null;
  name = '';

  ngOnInit(): void {
    this.uri = this.route.snapshot.paramMap.get('uri');
    this.name = this.route.snapshot.queryParamMap.get('name') || '';
    if (this.uri) {
      this.connection
        .call((mopidy) => mopidy.playlists.getItems({ uri: this.uri }))
        .then((items) => this.items.set(items || []))
        .catch((error) => this.logging.warn('Error loading playlist ' + this.uri, error));
    }
  }

  async addStream(): Promise<void> {
    const stream = await this.popup.addStream(true);
    if (stream) {
      this.items.update((items) => [...items, { __model__: 'Track', name: stream.name, uri: stream.uri }]);
    }
  }

  cancel(): void {
    this.nav.back();
  }

  remove(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
  }

  reorder(event: CustomEvent<ItemReorderEventDetail>): void {
    const { from, to } = event.detail;
    event.detail.complete(false);
    this.items.update((items) => {
      const result = [...items];
      result.splice(to, 0, ...result.splice(from, 1));
      return result;
    });
  }

  async saveAndClose(): Promise<void> {
    await this.save();
    this.nav.back();
  }

  private async save(): Promise<void> {
    const tracks = this.items().map((item) => ({ __model__: 'Track', name: item.name, uri: item.uri }));
    const playlist = await this.connection.call(async (mopidy) => {
      const playlist = this.uri
        ? await mopidy.playlists.lookup({ uri: this.uri })
        : await mopidy.playlists.create({ name: this.name });
      return mopidy.playlists.save({
        playlist: { ...playlist, name: this.name || playlist.name, tracks },
      });
    });
    if (playlist) {
      this.uri = playlist.uri;
      this.name = playlist.name;
    }
    await this.playlists.reload();
  }
}
