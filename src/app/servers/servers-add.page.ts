import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';

import { ServersService } from '../services/servers.service';
import { TranslatePipe } from '../services/translate.service';

@Component({
  selector: 'app-servers-add',
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonTitle,
    IonToggle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="start" name="close" />
            {{ 'Cancel' | translate }}
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'Add server' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form #form="ngForm" (ngSubmit)="add()">
        <ion-list>
          <ion-item>
            <ion-input
              name="name"
              [(ngModel)]="name"
              [label]="'Name' | translate"
              labelPlacement="stacked"
              placeholder="Mopidy Server"
              required
            />
          </ion-item>
          <ion-item>
            <ion-input
              name="host"
              [(ngModel)]="host"
              [label]="'Host' | translate"
              labelPlacement="stacked"
              placeholder="192.168.1.1"
              required
            />
          </ion-item>
          <ion-item>
            <ion-input
              name="port"
              type="number"
              [(ngModel)]="port"
              [label]="'Port' | translate"
              labelPlacement="stacked"
              placeholder="6680"
              required
            />
          </ion-item>
          <ion-item>
            <ion-input
              name="path"
              [(ngModel)]="path"
              [label]="'Path' | translate"
              labelPlacement="stacked"
              placeholder="/mopidy/ws/"
              required
            />
          </ion-item>
          <ion-item>
            <ion-toggle name="secure" [(ngModel)]="secure">{{ 'Secure connection' | translate }}</ion-toggle>
          </ion-item>
        </ion-list>
        <ion-button class="ion-margin" expand="block" type="submit" [disabled]="!!form.invalid">
          {{ 'Add server' | translate }}
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class ServersAddPage {
  name = '';
  host = '';
  port: number | null = 6680;
  path = '/mopidy/ws/';
  secure = false;

  private readonly nav = inject(NavController);
  private readonly servers = inject(ServersService);

  webSocketUrl(): string {
    return `${this.secure ? 'wss' : 'ws'}://${this.host}:${this.port}${this.path}`;
  }

  add(): void {
    this.servers.add({ name: this.name, url: this.webSocketUrl() });
    this.nav.back();
  }

  cancel(): void {
    this.nav.back();
  }
}
