import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

import { PopupService } from '../services/popup.service';
import { Server, ServersService } from '../services/servers.service';
import { TranslatePipe } from '../services/translate.service';

@Component({
  selector: 'app-servers-edit',
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, TranslatePipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="done()">
            <ion-icon slot="start" name="checkmark" />
            {{ 'Done' | translate }}
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'Configured servers' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="add()">
            <ion-icon slot="icon-only" name="create" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (server of configured(); track server.url + server.name) {
          <ion-item>
            <ion-button slot="start" fill="clear" color="danger" (click)="remove(server)">
              <ion-icon slot="icon-only" name="remove-circle" />
            </ion-button>
            <ion-label>
              <h2>{{ server.name }}</h2>
              <p>{{ server.url }}</p>
            </ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class ServersEditPage {
  readonly servers = inject(ServersService);
  readonly configured = computed(() => this.servers.servers().filter((server) => !server.auto));

  private readonly nav = inject(NavController);
  private readonly popup = inject(PopupService);
  private readonly route = inject(ActivatedRoute);

  add(): void {
    this.nav.navigateForward(['../add'], { relativeTo: this.route });
  }

  done(): void {
    this.nav.back();
  }

  async remove(server: Server): Promise<void> {
    if (await this.popup.confirm('Remove server')) {
      this.servers.remove(server);
    }
  }
}
