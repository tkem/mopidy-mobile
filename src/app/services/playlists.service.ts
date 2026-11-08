import { Injectable, computed, inject, signal } from '@angular/core';

import { Ref } from '../models';
import { ConnectionService } from './connection.service';
import { LoggingService } from './logging.service';
import { PopupService } from './popup.service';

export interface PlaylistOrder {
  name?: boolean;
  scheme?: boolean;
}

function scheme(uri: string): string {
  return uri.substring(0, uri.indexOf(':'));
}

/** The list of playlists, shared by the playlists views. */
@Injectable({ providedIn: 'root' })
export class PlaylistsService {
  private readonly connection = inject(ConnectionService);
  private readonly logging = inject(LoggingService);
  private readonly popup = inject(PopupService);

  readonly playlists = signal<Ref[]>([]);
  readonly order = signal<PlaylistOrder>({});

  /** Playlists, sorted by the current order. */
  readonly sorted = computed(() => {
    const order = this.order();
    let playlists = this.playlists();
    if (order.name) {
      playlists = [...playlists].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    if (order.scheme) {
      playlists = [...playlists].sort((a, b) => scheme(a.uri).localeCompare(scheme(b.uri)));
    }
    return playlists;
  });

  private started = false;

  constructor() {
    this.connection.on('state:online').subscribe(() => this.reload());
    for (const event of ['playlistsLoaded', 'playlistChanged', 'playlistDeleted']) {
      this.connection.on('event:' + event).subscribe(() => this.reload());
    }
  }

  start(): void {
    if (!this.started) {
      this.started = true;
      this.connection
        .call((mopidy) => mopidy.playlists.asList())
        .then((playlists) => this.playlists.set(playlists))
        .catch((error) => this.logging.warn('Error loading playlists', error));
    }
  }

  async reload(): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      this.playlists.set(await mopidy.playlists.asList());
    } catch (error) {
      this.logging.warn('Error loading playlists', error);
    }
  }

  async refresh(): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      await mopidy.playlists.refresh({ uri_scheme: null });
    } finally {
      await this.reload();
    }
  }

  async confirmDelete(ref: Ref): Promise<void> {
    if (await this.popup.confirm('Delete playlist')) {
      await this.connection.call(async (mopidy) => {
        await mopidy.playlists.delete({ uri: ref.uri });
        this.playlists.set(await mopidy.playlists.asList());
      });
    }
  }

  setOrder(order: PlaylistOrder): void {
    this.order.update((current) => ({ ...current, ...order }));
  }
}
