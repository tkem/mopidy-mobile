import { Component, OnInit, computed, inject } from '@angular/core';
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

import { LoggingService } from '../services/logging.service';
import { MopidyApi, MopidyFactory } from '../services/mopidy.service';
import { PlatformService } from '../services/platform.service';
import { Server, ServersService } from '../services/servers.service';
import { SettingsService } from '../services/settings.service';
import { TranslatePipe } from '../services/translate.service';

@Component({
  selector: 'app-servers',
  imports: [
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
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        @if (inSettings) {
          <ion-buttons slot="start">
            <ion-back-button defaultHref="/settings" [text]="'Back' | translate" />
          </ion-buttons>
        }
        <ion-title>{{ 'Mopidy servers' | translate }}</ion-title>
        <ion-buttons slot="end">
          @if (configured().length) {
            <ion-button (click)="navigate('edit')">
              <ion-icon slot="icon-only" name="pencil" />
            </ion-button>
          } @else {
            <ion-button (click)="navigate('add')">
              <ion-icon slot="icon-only" name="create" />
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content [pullingText]="'Pull to refresh' | translate" />
      </ion-refresher>
      @if (servers.servers().length) {
        <ion-list>
          @for (server of servers.servers(); track server.url) {
            <ion-item button [detail]="true" [class.app-current]="server.url === servers.currentUrl()" (click)="connect(server)">
              <ion-label>
                <h2>{{ server.name }}</h2>
                <p>{{ server.url }}</p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      } @else {
        <div class="ion-padding">
          <h2>{{ 'No servers found' | translate }}</h2>
          <p>
            {{ 'Please make sure Zeroconf is enabled for any Mopidy servers in the same WiFi network as your device.' | translate }}
          </p>
          <p>{{ 'Then pull to refresh, or add a server manually.' | translate }}</p>
        </div>
      }
    </ion-content>
  `,
})
export class ServersPage implements OnInit {
  readonly servers = inject(ServersService);
  readonly configured = computed(() => this.servers.servers().filter((server) => !server.auto));
  readonly inSettings = inject(ActivatedRoute).snapshot.pathFromRoot.some((r) => r.routeConfig?.path === 'settings');

  private readonly factory = inject(MopidyFactory);
  private readonly logging = inject(LoggingService);
  private readonly nav = inject(NavController);
  private readonly platform = inject(PlatformService);
  private readonly route = inject(ActivatedRoute);
  private readonly settings = inject(SettingsService);

  ngOnInit(): void {
    if (!this.servers.currentUrl() && !this.inSettings) {
      this.reconnect();
    }
  }

  navigate(path: string): void {
    this.nav.navigateForward([path], { relativeTo: this.route });
  }

  async connect(server: Server, mopidy?: MopidyApi): Promise<void> {
    await this.servers.connect(server, mopidy);
    if (this.inSettings) {
      // discard all views showing data of the previous server
      await this.nav.navigateRoot('/servers', { animated: false });
    }
    await this.nav.navigateRoot('/playback');
  }

  refresh(event: RefresherCustomEvent): void {
    this.servers.refresh().finally(() => event.target.complete());
  }

  /** Reconnect to the last server used, if available. */
  private async reconnect(): Promise<void> {
    const server = this.settings.get().server;
    if (server?.url) {
      try {
        const mopidy = await this.factory.create({ webSocketUrl: server.url }, 3000);
        await this.connect(server, mopidy);
        return;
      } catch (error) {
        this.logging.warn('Error connecting to ' + server.url, error);
      }
    }
    const splashscreen = await this.platform.splashscreen();
    // give view some time to update
    setTimeout(() => splashscreen.hide(), this.servers.servers().length ? 250 : 1000);
  }
}
