import { Injectable, NgZone, inject, signal } from '@angular/core';

import { ConnectionService } from './connection.service';
import { LoggingService } from './logging.service';
import { MopidyApi } from './mopidy.service';
import { PlatformService, Zeroconf, ZeroconfService } from './platform.service';
import { Server, SettingsService } from './settings.service';

export type { Server } from './settings.service';

function createServer(service: ZeroconfService): Server | null {
  // TODO: IPv6 addresses are ignored for now
  if (service.ipv4Addresses.length) {
    return {
      name: service.name,
      url: `ws://${service.ipv4Addresses[0]}:${service.port}/mopidy/ws/`,
    };
  } else {
    return null;
  }
}

/** Configured and detected (via Zeroconf) Mopidy servers. */
@Injectable({ providedIn: 'root' })
export class ServersService {
  private readonly connection = inject(ConnectionService);
  private readonly logging = inject(LoggingService);
  private readonly platform = inject(PlatformService);
  private readonly settings = inject(SettingsService);
  private readonly zone = inject(NgZone);

  private configured: Server[] = this.settings.get().servers;
  private detected = new Map<string, Server>();
  private readonly serversSignal = signal<Server[]>([]);
  private readonly currentUrlSignal = signal<string | null>(null);

  /** All known servers, configured servers first. */
  readonly servers = this.serversSignal.asReadonly();

  /** The WebSocket URL of the currently connected server. */
  readonly currentUrl = this.currentUrlSignal.asReadonly();

  constructor() {
    this.update();
    this.platform
      .zeroconf()
      .then((zeroconf) => this.watch(zeroconf))
      .catch((error) => this.logging.error('Zeroconf not available', error));
  }

  add(server: Server): void {
    this.configured = [...this.configured, { name: server.name, url: server.url }];
    this.settings.extend({ servers: this.configured });
    this.logging.info('Mopidy server added', server);
    this.update();
  }

  remove(server: Server): void {
    this.configured = this.configured.filter((obj) => obj.name !== server.name || obj.url !== server.url);
    this.settings.extend({ servers: this.configured });
    this.logging.info('Mopidy server removed', server);
    this.update();
  }

  /** Restart Zeroconf discovery. */
  async refresh(): Promise<void> {
    try {
      const zeroconf = await this.platform.zeroconf();
      this.detected = new Map();
      this.update();
      zeroconf.close();
      this.watch(zeroconf);
      // TODO: resolve on first server found
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      this.logging.error('Zeroconf not available', error);
    }
  }

  /** Connect to a server, optionally using an existing client. */
  async connect(server: Server, mopidy?: MopidyApi): Promise<void> {
    this.currentUrlSignal.set(server.url);
    await this.connection.reset(server.url, mopidy);
    this.settings.extend({ server: { name: server.name, url: server.url } });
  }

  private update(): void {
    const configured = [...this.configured]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((obj) => ({ ...obj, auto: false }));
    const detected = [...this.detected.values()]
      .filter((obj) => !this.configured.some((server) => server.url === obj.url))
      .map((obj) => ({ ...obj, auto: true }));
    this.serversSignal.set([...configured, ...detected]);
  }

  private watch(zeroconf: Zeroconf): void {
    this.logging.debug('Starting zeroconf discovery');
    zeroconf.watch(
      '_mopidy-http._tcp.',
      'local.',
      (result) =>
        this.zone.run(() => {
          this.logging.debug('Zeroconf:' + result.action, result);
          const server = createServer(result.service);
          if (!server) {
            return;
          }
          if (result.action === 'resolved' && !this.detected.has(server.url)) {
            this.detected.set(server.url, server);
            this.update();
          } else if (result.action === 'removed' && this.detected.has(server.url)) {
            this.detected.delete(server.url);
            this.update();
          }
        }),
      (error) => this.zone.run(() => this.logging.error('Zeroconf error:', error)),
    );
  }
}
