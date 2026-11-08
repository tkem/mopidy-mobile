import { Injectable, computed, inject, signal } from '@angular/core';

import { Image, TlTrack, TracklistOptions } from '../models';
import { paging } from '../shared/paging';
import { THUMBNAIL_SIZE } from '../shared/thumbnail.component';
import { ConnectionService } from './connection.service';
import { CoverartService } from './coverart.service';
import { LoggingService } from './logging.service';
import { PopupService } from './popup.service';

/** The current tracklist, shared by the tracklist views. */
@Injectable({ providedIn: 'root' })
export class TracklistService {
  private readonly connection = inject(ConnectionService);
  private readonly coverart = inject(CoverartService);
  private readonly logging = inject(LoggingService);
  private readonly popup = inject(PopupService);

  readonly tlTracks = signal<TlTrack[]>([]);
  readonly currentTlTrack = signal<TlTrack | null>(null);
  readonly options = signal<TracklistOptions>({});
  readonly images = signal<Record<string, Image | null>>({});

  /** Index of the current track, or -1. */
  readonly currentIndex = computed(() => {
    const current = this.currentTlTrack();
    return current ? this.tlTracks().findIndex((tlTrack) => tlTrack.tlid === current.tlid) : -1;
  });

  private started = false;
  private abort: AbortController | null = null;

  constructor() {
    this.connection.on('event:optionsChanged').subscribe(() =>
      this.connection.call((mopidy) => mopidy.tracklist.getOptions()).then((options) => this.options.set(options)),
    );
    this.connection.on('event:tracklistChanged').subscribe(() =>
      this.connection.call((mopidy) => mopidy.tracklist.getTlTracks()).then((tlTracks) => this.setTlTracks(tlTracks)),
    );
    this.connection.on('event:trackPlaybackEnded').subscribe(() => this.currentTlTrack.set(null));
    this.connection
      .on<{ tl_track: TlTrack }>('event:trackPlaybackStarted')
      .subscribe((data) => this.currentTlTrack.set(data.tl_track));
    this.connection.on('state:online').subscribe(() => this.reload());
  }

  start(): void {
    if (!this.started) {
      this.started = true;
      this.reload();
    }
  }

  async reload(): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      const [currentTlTrack, options, tlTracks] = await Promise.all([
        mopidy.playback.getCurrentTlTrack(),
        mopidy.tracklist.getOptions(),
        mopidy.tracklist.getTlTracks(),
      ]);
      this.currentTlTrack.set(currentTlTrack);
      this.options.set(options);
      this.setTlTracks(tlTracks);
    } catch (error) {
      this.logging.warn('Error loading tracklist', error);
    }
  }

  add(uri: string): Promise<TlTrack[]> {
    return this.connection.call((mopidy) => mopidy.tracklist.add({ uris: [uri] }));
  }

  clear(): Promise<unknown> {
    return this.connection.call((mopidy) => mopidy.tracklist.clear());
  }

  async confirmClear(): Promise<void> {
    if (await this.popup.confirm('Clear tracklist')) {
      await this.clear();
    }
  }

  move(fromIndex: number, toIndex: number): Promise<unknown> {
    // update local copy first for user feedback
    const tlTracks = [...this.tlTracks()];
    tlTracks.splice(toIndex, 0, ...tlTracks.splice(fromIndex, 1));
    this.tlTracks.set(tlTracks);
    return this.connection.call((mopidy) =>
      mopidy.tracklist.move({ start: fromIndex, end: fromIndex + 1, to_position: toIndex }),
    );
  }

  play(tlTrack: TlTrack): Promise<unknown> {
    return this.connection.call((mopidy) => mopidy.playback.play({ tlid: tlTrack.tlid }));
  }

  remove(tlTrack: TlTrack): Promise<unknown> {
    // update local copy first for user feedback
    this.tlTracks.update((tlTracks) => tlTracks.filter((obj) => obj.tlid !== tlTrack.tlid));
    return this.connection.call((mopidy) => mopidy.tracklist.remove({ criteria: { tlid: [tlTrack.tlid] } }));
  }

  async saveAs(): Promise<void> {
    const name = await this.popup.prompt('Playlist Name', 'My Playlist');
    if (name) {
      const tracks = this.tlTracks().map((tlTrack) => tlTrack.track);
      await this.connection.call(async (mopidy) => {
        const playlist = await mopidy.playlists.create({ name });
        playlist.tracks = tracks;
        return mopidy.playlists.save({ playlist });
      });
    }
  }

  toggleConsume(): Promise<unknown> {
    const value = !this.options().consume;
    return this.connection.call((mopidy) => mopidy.tracklist.setConsume({ value }));
  }

  toggleRandom(): Promise<unknown> {
    const value = !this.options().random;
    return this.connection.call((mopidy) => mopidy.tracklist.setRandom({ value }));
  }

  toggleRepeat(): Promise<unknown> {
    const value = !this.options().repeat;
    return this.connection.call((mopidy) => mopidy.tracklist.setRepeat({ value }));
  }

  toggleSingle(): Promise<unknown> {
    const value = !this.options().single;
    return this.connection.call((mopidy) => mopidy.tracklist.setSingle({ value }));
  }

  private setTlTracks(tlTracks: TlTrack[]): void {
    this.tlTracks.set(tlTracks);
    // keep images of tracks still in the tracklist, load the others
    const previous = this.images();
    const images: Record<string, Image | null> = {};
    const tracks = [];
    for (const { track } of tlTracks) {
      if (track.uri in previous) {
        images[track.uri] = previous[track.uri];
      } else {
        tracks.push(track);
      }
    }
    this.images.set(images);
    this.abort?.abort();
    const abort = (this.abort = new AbortController());
    paging(
      tracks,
      10,
      (chunk) => this.coverart.getImages(chunk, THUMBNAIL_SIZE),
      (result) => this.images.update((images) => ({ ...images, ...result })),
      abort.signal,
    ).catch((error) => this.logging.error('Error loading cover art', error));
  }
}
