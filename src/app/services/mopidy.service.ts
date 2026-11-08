/* eslint-disable @typescript-eslint/no-explicit-any -- Mopidy's API is dynamic */
import { Injectable, inject } from '@angular/core';
import Mopidy from 'mopidy';

import { LoggingService } from './logging.service';

/**
 * The Mopidy client API.
 *
 * Mopidy's core API is generated dynamically from the server's API
 * description, and extended by `extend()` below, so it is not typed here.
 */
export type MopidyApi = any;

export interface MopidySettings {
  webSocketUrl?: string;
  backoffDelayMin?: number;
  backoffDelayMax?: number;
}

type MopidyOptions = ConstructorParameters<typeof Mopidy>[0];

export const ConnectionError = (Mopidy as unknown as { ConnectionError: new (message?: string) => Error })
  .ConnectionError;

/** Add convenience methods to the Mopidy client API. */
export function extend(mopidy: MopidyApi): MopidyApi {
  // the tlid of the track returned by `fn` for the current track, or null
  const relativeTlid = (fn: (tlTrack: unknown) => Promise<{ tlid: number } | null>) =>
    mopidy.playback
      .getCurrentTlTrack()
      .then(fn)
      .then((tlTrack: { tlid: number } | null) => (tlTrack ? tlTrack.tlid : null));

  Object.assign(mopidy.tracklist, {
    getNextTlid: () => relativeTlid((tlTrack) => mopidy.tracklist.nextTrack({ tl_track: tlTrack })),
    getPreviousTlid: () => relativeTlid((tlTrack) => mopidy.tracklist.previousTrack({ tl_track: tlTrack })),
    // see https://github.com/mopidy/mopidy/issues/977
    getOptions: () =>
      Promise.all([
        mopidy.tracklist.getConsume(),
        mopidy.tracklist.getRandom(),
        mopidy.tracklist.getRepeat(),
        mopidy.tracklist.getSingle(),
      ]).then(([consume, random, repeat, single]) => ({ consume, random, repeat, single })),
  });
  return mopidy;
}

/** Creates Mopidy client connections. */
@Injectable({ providedIn: 'root' })
export class MopidyFactory {
  private readonly logging = inject(LoggingService);

  /** Connect to a Mopidy server, with an optional timeout in ms. */
  create(settings: MopidySettings, timeout?: number | null): Promise<MopidyApi> {
    return new Promise((resolve, reject) => {
      const mopidy: MopidyApi = new Mopidy({ ...settings, autoConnect: false } as MopidyOptions);
      let done = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const destroy = () => {
        mopidy.close();
        mopidy.removeAllListeners();
      };

      if (timeout) {
        timer = setTimeout(() => {
          if (!done) {
            done = true;
            reject(new ConnectionError('Connection timeout'));
            destroy();
          }
        }, timeout);
      }
      mopidy.once('state:online', () => {
        if (timer) {
          clearTimeout(timer);
        }
        if (!done) {
          done = true;
          this.logging.info('Connected');
          resolve(extend(mopidy));
        }
      });
      mopidy.once('state:offline', () => {
        if (timer) {
          clearTimeout(timer);
        }
        if (!done) {
          done = true;
          reject(new ConnectionError());
          destroy();
        }
      });
      if (settings.webSocketUrl) {
        this.logging.info('Connecting to ' + settings.webSocketUrl);
      } else {
        this.logging.info('Connecting to default WebSocket');
      }
      this.logEvents(mopidy);
      mopidy.connect();
    });
  }

  private logEvents(mopidy: MopidyApi): void {
    const log = (...args: unknown[]) => {
      if (this.logging.debugEnabled) {
        this.logging.debug(
          ...args.map((obj) => {
            if (obj instanceof MessageEvent && obj.data) {
              try {
                return JSON.parse(obj.data);
              } catch {
                return obj.data;
              }
            }
            return obj;
          }),
        );
      }
    };
    mopidy.on('state', log);
    mopidy.on('event', log);
    for (const name of ['websocket:incomingMessage', 'websocket:outgoingMessage']) {
      mopidy.on(name, (...args: unknown[]) => log(name, ...args));
    }
  }
}
