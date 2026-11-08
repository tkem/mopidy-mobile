import { Injectable, inject } from '@angular/core';

import { Image, Model, Track } from '../models';
import { paging } from '../shared/paging';
import { THUMBNAIL_SIZE } from '../shared/thumbnail.component';
import { ConnectionService } from './connection.service';
import { CoverartService } from './coverart.service';
import { LoggingService } from './logging.service';

export interface DetailsCallbacks {
  /** Called with track details for library refs. */
  tracks?: (tracks: Record<string, Track>) => void;
  /** Called with cover art thumbnails. */
  images: (images: Record<string, Image | null>) => void;
}

/** Load track details and cover art for list items, page by page. */
@Injectable({ providedIn: 'root' })
export class DetailsService {
  private readonly connection = inject(ConnectionService);
  private readonly coverart = inject(CoverartService);
  private readonly logging = inject(LoggingService);

  /**
   * Load details for the given items; library refs are looked up first,
   * if a `tracks` callback is given.
   */
  load(items: Model[], callbacks: DetailsCallbacks, signal: AbortSignal, pageSize = 10): void {
    paging(
      items,
      pageSize,
      async (chunk) => {
        let models = chunk;
        if (callbacks.tracks) {
          const refs = chunk.filter((item) => item.__model__ === 'Ref');
          if (refs.length) {
            const mopidy = await this.connection.get();
            const result: Record<string, Track[]> = await mopidy.library.lookup({ uris: refs.map((ref) => ref.uri) });
            const tracks: Record<string, Track> = {};
            for (const ref of refs) {
              const found = result[ref.uri];
              if (found && found.length === 1) {
                tracks[ref.uri] = { ...ref, ...found[0] };
              }
            }
            if (!signal.aborted) {
              callbacks.tracks(tracks);
            }
            models = chunk.map((item) => tracks[item.uri] || item);
          }
        }
        return this.coverart.getImages(models, THUMBNAIL_SIZE);
      },
      (images) => callbacks.images(images),
      signal,
    ).catch((error) => this.logging.error('Error loading details', error));
  }
}
