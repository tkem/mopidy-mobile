import { Injectable, NgZone, inject, signal } from '@angular/core';

import { Image, Track } from '../models';
import { LoggingService } from './logging.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    cordova?: any;
    AppVersion?: { version: string };
    MusicControls?: any;
    plugins?: any;
  }
  interface Navigator {
    app?: { exitApp(): void };
    splashscreen?: Splashscreen;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface Splashscreen {
  show(): void;
  hide(): void;
}

export interface ZeroconfService {
  name: string;
  port: number;
  ipv4Addresses: string[];
  ipv6Addresses: string[];
}

export interface ZeroconfResult {
  action: 'added' | 'resolved' | 'removed';
  service: ZeroconfService;
}

export interface Zeroconf {
  watch(type: string, domain: string, success: (result: ZeroconfResult) => void, failure?: (error: unknown) => void): void;
  unwatch(type: string, domain: string): void;
  close(): void;
}

/** Playback state and controls for the system's media notification. */
export interface PlaybackControls {
  track: Track | null;
  image: Image | null;
  state: string;
  streamTitle: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  play(): unknown;
  pause(): unknown;
  next(): unknown;
  previous(): unknown;
}

const NOOP_SPLASHSCREEN: Splashscreen = { show: () => undefined, hide: () => undefined };

const NOOP_ZEROCONF: Zeroconf = { watch: () => undefined, unwatch: () => undefined, close: () => undefined };

function getNotificationSubtitle(controls: PlaybackControls): string {
  const track = controls.track;
  if (controls.streamTitle) {
    return controls.streamTitle;
  } else if (!track) {
    return 'n/a';
  } else if (track.artists?.length) {
    return track.artists.map((artist) => artist.name).join(' ');
  } else if (track.album?.name) {
    return track.album.name;
  } else {
    return track.genre || '';
  }
}

/**
 * Platform specifics, i.e. whether running as a Web extension hosted by
 * a Mopidy server, or as a Cordova app.
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly logging = inject(LoggingService);
  private readonly zone = inject(NgZone);
  private readonly readyPromise: Promise<void>;
  private playbackControls: PlaybackControls | null = null;
  private paused = false;

  /** The application version, once known. */
  readonly version = signal('');

  constructor() {
    if (this.isWebView()) {
      this.readyPromise = new Promise((resolve) => document.addEventListener('deviceready', () => resolve(), false));
      this.readyPromise.then(() => this.initMusicControls());
    } else {
      this.readyPromise = Promise.resolve();
    }
  }

  /** Whether hosted as a Web extension by a Mopidy server. */
  isHosted(): boolean {
    return document.body.hasAttribute('data-web-socket-url');
  }

  /** The WebSocket URL configured by the hosting Mopidy server. */
  webSocketUrl(): string | null {
    return document.body.getAttribute('data-web-socket-url') || null;
  }

  /** Whether running as a Cordova app. */
  isWebView(): boolean {
    return !!window.cordova;
  }

  canShare(): boolean {
    return this.isWebView();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  async appVersion(): Promise<string> {
    if (this.isWebView()) {
      await this.ready();
      return window.AppVersion?.version || 'develop';
    } else {
      return document.body.getAttribute('data-version') || 'develop';
    }
  }

  exitApp(): void {
    navigator.app?.exitApp();
  }

  /** Open a URL in the system's browser. */
  openExternal(url: string): void {
    if (this.isWebView() && window.cordova?.InAppBrowser) {
      window.cordova.InAppBrowser.open(url, '_system');
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  async share(subject: string, message: string): Promise<unknown> {
    await this.ready();
    return new Promise((resolve, reject) => {
      window.plugins.socialsharing.shareWithOptions(
        { subject, message },
        (result: unknown) => this.zone.run(() => resolve(result)),
        (error: unknown) => this.zone.run(() => reject(error)),
      );
    });
  }

  async splashscreen(): Promise<Splashscreen> {
    if (this.isWebView()) {
      await this.ready();
      return navigator.splashscreen || NOOP_SPLASHSCREEN;
    } else {
      return NOOP_SPLASHSCREEN;
    }
  }

  async zeroconf(): Promise<Zeroconf> {
    if (this.isWebView()) {
      await this.ready();
      const zeroconf = window.cordova?.plugins?.zeroconf;
      if (!zeroconf) {
        throw new Error('Zeroconf plugin not installed');
      }
      return zeroconf;
    } else {
      return NOOP_ZEROCONF;
    }
  }

  /** Listen for Cordova document events, e.g. "volumeupbutton". */
  addEventListener(name: string, listener: () => void): void {
    this.ready().then(() => {
      document.addEventListener(name, () => this.zone.run(listener), false);
    });
  }

  /** Update the system's media notification. */
  async updatePlaybackControls(controls: PlaybackControls): Promise<void> {
    if (!this.isWebView()) {
      return;
    }
    await this.ready();
    const musicControls = window.MusicControls;
    if (!musicControls) {
      return;
    }
    this.playbackControls = controls;
    await new Promise((resolve, reject) => {
      const track = controls.track;
      if (track) {
        musicControls.create(
          {
            track: track.name || track.uri || '',
            artist: getNotificationSubtitle(controls),
            cover: controls.image?.uri || 'assets/icon.png',
            dismissable: this.paused,
            isPlaying: controls.state === 'playing',
            hasPrev: controls.hasPrevious,
            hasNext: controls.hasNext,
            hasClose: false,
          },
          resolve,
          reject,
        );
      } else {
        musicControls.destroy(resolve, reject);
      }
    });
  }

  async updatePlaybackState(state: string): Promise<void> {
    if (this.isWebView()) {
      await this.ready();
      window.MusicControls?.updateIsPlaying(state === 'playing');
    }
  }

  private initMusicControls(): void {
    const musicControls = window.MusicControls;
    if (!musicControls) {
      this.logging.warn('Music controls plugin not installed');
      return;
    }
    document.addEventListener('pause', () => {
      musicControls.updateDismissable(true);
      this.paused = true;
    });
    document.addEventListener('resume', () => {
      musicControls.updateDismissable(false);
      this.paused = false;
    });
    musicControls.subscribe((action: string) =>
      this.zone.run(() => {
        const controls = this.playbackControls;
        if (!controls) {
          return;
        }
        switch (JSON.parse(action).message) {
          case 'music-controls-next':
            controls.next();
            break;
          case 'music-controls-previous':
            controls.previous();
            break;
          case 'music-controls-pause':
            controls.pause();
            break;
          case 'music-controls-play':
            controls.play();
            break;
          case 'music-controls-destroy':
            this.exitApp();
            break;
        }
      }),
    );
    musicControls.listen();
  }
}
