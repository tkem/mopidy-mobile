import { Injectable, inject, signal } from '@angular/core';

import { Image, TlTrack, Track, TracklistOptions } from '../models';
import { ConnectionService } from './connection.service';
import { CoverartService } from './coverart.service';
import { LoggingService } from './logging.service';
import { PlatformService } from './platform.service';

/** Tracks the playback position, updated in regular intervals. */
class PositionTimer {
  private start = 0;
  private value = 0;
  private limit: number | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly callback: (value: number) => void,
    private readonly delay: number,
  ) {}

  set(value: number): void {
    this.start = Date.now() - value;
    this.value = value;
    this.callback(value);
  }

  run(value?: number, limit?: number | null): void {
    if (value !== undefined) {
      this.value = value;
    }
    if (limit !== undefined) {
      this.limit = limit;
    }
    if (!this.interval) {
      this.interval = setInterval(() => {
        let value = Date.now() - this.start;
        if (this.limit !== null && value > this.limit) {
          value = this.limit;
        }
        this.callback(value);
      }, this.delay);
    }
    this.start = Date.now() - this.value;
    this.callback(this.value);
  }

  stop(value?: number): void {
    if (value !== undefined) {
      this.value = value;
    } else if (this.interval) {
      this.value = Date.now() - this.start;
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.callback(this.value);
  }
}

/** Current playback state and controls. */
@Injectable({ providedIn: 'root' })
export class PlaybackService {
  private readonly connection = inject(ConnectionService);
  private readonly coverart = inject(CoverartService);
  private readonly logging = inject(LoggingService);
  private readonly platform = inject(PlatformService);

  readonly track = signal<Track | null>(null);
  readonly image = signal<Image | null>(null);
  readonly state = signal('stopped');
  readonly options = signal<TracklistOptions>({});
  readonly position = signal(0);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly streamTitle = signal<string | null>(null);

  private seeking = false;
  private started = false;
  private updates = 0;
  private readonly timer = new PositionTimer((value) => {
    if (!this.seeking) {
      this.position.set(value);
    }
  }, 1000);

  constructor() {
    const on = <T>(name: string, fn: (data: T) => void) => this.connection.on<T>(name).subscribe(fn);

    on('event:optionsChanged', () => this.updateOptions());
    on<{ new_state: string }>('event:playbackStateChanged', (data) => {
      this.state.set(data.new_state);
      if (data.new_state === 'playing') {
        this.timer.run();
      } else {
        this.timer.stop();
      }
      this.platform.updatePlaybackState(data.new_state).catch((error) => this.logError(error));
    });
    on<{ time_position: number }>('event:seeked', (data) => this.timer.set(data.time_position));
    on<{ title: string }>('event:streamTitleChanged', (data) => {
      this.streamTitle.set(data.title);
      this.updateControls();
    });
    on('event:tracklistChanged', () =>
      this.setCurrentTlTrack(this.connection.call((mopidy) => mopidy.playback.getCurrentTlTrack())),
    );
    on('event:trackPlaybackEnded', () => this.timer.stop(0));
    on<{ time_position: number }>('event:trackPlaybackPaused', (data) => this.timer.stop(data.time_position));
    on<{ time_position: number }>('event:trackPlaybackResumed', (data) => this.timer.run(data.time_position));
    on<{ tl_track: TlTrack }>('event:trackPlaybackStarted', (data) => {
      this.setCurrentTlTrack(data.tl_track);
      this.timer.run(0, data.tl_track.track.length || null);
    });
    on('state:online', () => this.reload());
  }

  /** Load the initial playback state; hides the splash screen when done. */
  start(): void {
    if (!this.started) {
      this.started = true;
      this.reload().finally(() =>
        this.platform.splashscreen().then((splashscreen) => setTimeout(() => splashscreen.hide(), 250)),
      );
    }
  }

  async reload(): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      const [currentTlTrack, state, timePosition, options] = await Promise.all([
        mopidy.playback.getCurrentTlTrack(),
        mopidy.playback.getState(),
        mopidy.playback.getTimePosition(),
        mopidy.tracklist.getOptions(),
      ]);
      this.state.set(state);
      this.options.set(options);
      if (state === 'playing') {
        this.timer.run(timePosition, currentTlTrack?.track?.length || null);
      } else {
        this.timer.stop(timePosition);
      }
      await this.setCurrentTlTrack(currentTlTrack);
    } catch (error) {
      this.logging.warn('Error loading playback state', error);
    }
  }

  play(): Promise<unknown> {
    return this.connection.call((mopidy) => mopidy.playback.play());
  }

  pause(): Promise<unknown> {
    return this.connection.call((mopidy) => mopidy.playback.pause());
  }

  stop(): Promise<unknown> {
    return this.connection.call((mopidy) => mopidy.playback.stop());
  }

  next(): Promise<unknown> {
    // calling next() while stopped triggers no events
    const state = this.state();
    return this.connection.call(async (mopidy) => {
      await mopidy.playback.next();
      if (state === 'stopped') {
        this.setCurrentTlTrack(mopidy.playback.getCurrentTlTrack());
      }
    });
  }

  previous(): Promise<unknown> {
    // calling previous() while stopped triggers no events
    const state = this.state();
    return this.connection.call(async (mopidy) => {
      await mopidy.playback.previous();
      if (state === 'stopped') {
        this.setCurrentTlTrack(mopidy.playback.getCurrentTlTrack());
      }
    });
  }

  togglePlay(): Promise<unknown> {
    return this.state() !== 'playing' ? this.play() : this.pause();
  }

  toggleRandom(): Promise<unknown> {
    const random = !this.options().random;
    return this.connection.call((mopidy) => mopidy.tracklist.setRandom({ value: random }));
  }

  /** Cycle through repeat off, repeat all, and repeat single track. */
  toggleRepeat(): Promise<unknown> {
    const options = this.options();
    return this.connection.call((mopidy) => {
      if (options.repeat && options.single) {
        return Promise.all([mopidy.tracklist.setRepeat({ value: false }), mopidy.tracklist.setSingle({ value: false })]);
      } else if (options.repeat) {
        return mopidy.tracklist.setSingle({ value: true });
      } else {
        return mopidy.tracklist.setRepeat({ value: true });
      }
    });
  }

  /** Called when the user starts dragging the position slider. */
  seekStart(): void {
    this.seeking = true;
  }

  seek(value: number): Promise<unknown> {
    this.seeking = true;
    this.position.set(value);
    return this.connection
      .call((mopidy) => mopidy.playback.seek({ time_position: Math.round(value) }))
      .finally(() => (this.seeking = false));
  }

  private updateOptions(): void {
    this.connection.call((mopidy) => mopidy.tracklist.getOptions()).then((options) => this.options.set(options));
  }

  /**
   * Update the current track. Updates are numbered when triggered, so
   * that results of outdated requests, which may complete after newer
   * ones, are ignored.
   */
  private async setCurrentTlTrack(currentTlTrack: TlTrack | null | Promise<TlTrack | null>): Promise<void> {
    const update = ++this.updates;
    const [current, [eotTlTrack, nextTlid, previousTlid, streamTitle]] = await Promise.all([
      currentTlTrack,
      this.connection.call((mopidy) =>
        Promise.all([
          mopidy.tracklist.eotTrack({ tl_track: null }),
          mopidy.tracklist.getNextTlid(),
          mopidy.tracklist.getPreviousTlid(),
          mopidy.playback.getStreamTitle(),
        ]),
      ),
    ]);
    if (update !== this.updates) {
      return;
    }
    const track: Track | null = current ? current.track : eotTlTrack ? eotTlTrack.track : null;
    this.track.set(track);
    this.hasNext.set(nextTlid !== null);
    this.hasPrevious.set(previousTlid !== null);
    this.streamTitle.set(streamTitle);
    this.image.set(null);
    this.updateControls();
    if (track) {
      this.coverart.getImage(track).then((image) => {
        if (this.track() === track) {
          this.image.set(image);
          this.updateControls();
        }
      });
    }
  }

  private updateControls(): void {
    this.platform
      .updatePlaybackControls({
        track: this.track(),
        image: this.image(),
        state: this.state(),
        streamTitle: this.streamTitle(),
        hasNext: this.hasNext(),
        hasPrevious: this.hasPrevious(),
        play: () => this.play(),
        pause: () => this.pause(),
        next: () => this.next(),
        previous: () => this.previous(),
      })
      .catch((error) => this.logError(error));
  }

  private logError(error: unknown): void {
    this.logging.error('Error updating playback controls:', error);
  }
}

/** Mixer volume and mute state. */
@Injectable({ providedIn: 'root' })
export class MixerService {
  private readonly connection = inject(ConnectionService);
  private readonly logging = inject(LoggingService);

  readonly volume = signal(0);
  readonly mute = signal(false);

  private pending = false;
  private target = 0;
  private started = false;

  constructor() {
    this.connection.on('state:online').subscribe(() => this.reload());
    this.connection.on<{ mute: boolean }>('event:muteChanged').subscribe((data) => this.mute.set(data.mute));
    this.connection.on<{ volume: number }>('event:volumeChanged').subscribe((data) => {
      if (!this.pending) {
        this.volume.set(data.volume);
      }
    });
  }

  start(): void {
    if (!this.started) {
      this.started = true;
      this.reload();
    }
  }

  reload(): Promise<void> {
    return this.connection
      .call((mopidy) => Promise.all([mopidy.mixer.getMute(), mopidy.mixer.getVolume()]))
      .then(([mute, volume]) => {
        this.mute.set(mute);
        this.volume.set(volume);
      })
      .catch((error) => this.logging.warn('Error loading mixer state', error));
  }

  setMute(mute: boolean): Promise<unknown> {
    return this.connection.call((mopidy) => mopidy.mixer.setMute({ mute }));
  }

  /** Set the volume; changes made while a request is pending are coalesced. */
  setVolume(volume: number): void {
    this.target = Math.round(volume);
    this.volume.set(this.target);
    if (!this.pending) {
      this.pending = true;
      this.sendVolume();
    }
  }

  private sendVolume(): void {
    const volume = this.target;
    this.connection.call((mopidy) => mopidy.mixer.setVolume({ volume })).then(
      () => {
        if (this.target !== volume) {
          this.sendVolume();
        } else {
          this.pending = false;
        }
      },
      () => (this.pending = false),
    );
  }
}
