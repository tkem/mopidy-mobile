/* eslint-disable @typescript-eslint/no-explicit-any -- Mopidy's API is dynamic */
import { Injectable, inject } from '@angular/core';
import Mopidy from 'mopidy';

import { LoggingService } from './logging.service';

/**
 * The Mopidy client API.
 *
 * Mopidy's core API is generated dynamically from the server's API
 * description, and extended by `shim()` below, so it is not typed here.
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

function zipObject<T>(keys: string[], values: T[]): Record<string, T> {
  const obj: Record<string, T> = {};
  keys.forEach((key, index) => (obj[key] = values[index]));
  return obj;
}

/** Adapt older Mopidy server APIs and add convenience methods. */
export function shim(mopidy: MopidyApi): MopidyApi {
  function hasParam(method: { params?: { name: string }[] }, name: string): boolean {
    return (method.params || []).some((param) => param.name === name);
  }

  function toRef(model: { __model__: string; name?: string; uri: string }) {
    return { __model__: 'Ref', type: model.__model__.toLowerCase(), name: model.name, uri: model.uri };
  }

  // Mopidy v1.0 library.lookup({uris: [...]})
  if (!hasParam(mopidy.library.lookup, 'uris')) {
    const lookup = mopidy.library.lookup;
    mopidy.library.lookup = (params: Record<string, any>) => {
      if ('uris' in params) {
        return Promise.all(params['uris'].map((uri: string) => lookup({ uri }))).then((results) =>
          zipObject(params['uris'], results),
        );
      } else {
        return lookup(params);
      }
    };
  }
  // Mopidy v1.0 tracklist.add({uris: [...]})
  if (!hasParam(mopidy.tracklist.add, 'uris')) {
    const add = mopidy.tracklist.add;
    mopidy.tracklist.add = (params: Record<string, any>) => {
      if ('uris' in params) {
        return mopidy.library
          .lookup({ uris: params['uris'] })
          .then((result: Record<string, unknown[]>) =>
            ([] as unknown[]).concat(...params['uris'].map((uri: string) => result[uri] || [])),
          )
          .then((tracks: unknown[]) => {
            if ('at_position' in params) {
              return add({ tracks, at_position: params['at_position'] });
            } else {
              return add({ tracks });
            }
          });
      } else {
        return add(params);
      }
    };
  }
  // Mopidy v1.0 library.search({exact: true|false})
  if (!hasParam(mopidy.library.search, 'exact')) {
    const search = mopidy.library.search;
    mopidy.library.search = (params: Record<string, any>) => {
      if (params['exact']) {
        return mopidy.library.findExact({ query: params['query'], uris: params['uris'] });
      } else {
        return search({ query: params['query'], uris: params['uris'] });
      }
    };
  }
  // additional (or missing) API features
  const extensions: Record<string, Record<string, unknown>> = {
    tracklist: {
      getEotTlid: () =>
        mopidy.playback
          .getCurrentTlTrack()
          .then((tlTrack: unknown) => mopidy.tracklist.eotTrack({ tl_track: tlTrack }))
          .then((tlTrack: { tlid: number } | null) => (tlTrack ? tlTrack.tlid : null)),
      getNextTlid: () =>
        mopidy.playback
          .getCurrentTlTrack()
          .then((tlTrack: unknown) => mopidy.tracklist.nextTrack({ tl_track: tlTrack }))
          .then((tlTrack: { tlid: number } | null) => (tlTrack ? tlTrack.tlid : null)),
      getPreviousTlid: () =>
        mopidy.playback
          .getCurrentTlTrack()
          .then((tlTrack: unknown) => mopidy.tracklist.previousTrack({ tl_track: tlTrack }))
          .then((tlTrack: { tlid: number } | null) => (tlTrack ? tlTrack.tlid : null)),
      // see https://github.com/mopidy/mopidy/issues/977
      getOptions: () =>
        Promise.all([
          mopidy.tracklist.getConsume(),
          mopidy.tracklist.getRandom(),
          mopidy.tracklist.getRepeat(),
          mopidy.tracklist.getSingle(),
        ]).then((results) => zipObject(['consume', 'random', 'repeat', 'single'], results)),
    },
    playback: {
      getCurrentTlid: () =>
        mopidy.playback
          .getCurrentTlTrack()
          .then((tlTrack: { tlid: number } | null) => (tlTrack ? tlTrack.tlid : null)),
      getStreamTitle: () => Promise.resolve(null),
    },
    library: {
      getImages: (params: Record<string, unknown>) =>
        mopidy.library.lookup(params).then((result: Record<string, { album?: { images?: string[] } }[]>) => {
          const images: Record<string, { __model__: string; uri: string }[]> = {};
          for (const [uri, tracks] of Object.entries(result)) {
            const uris = new Set<string>();
            for (const track of tracks) {
              for (const image of track.album?.images || []) {
                uris.add(image);
              }
            }
            images[uri] = [...uris].map((uri) => ({ __model__: 'Image', uri }));
          }
          return images;
        }),
    },
    playlists: {
      asList: () =>
        mopidy.playlists
          .getPlaylists()
          .then((playlists: { __model__: string; name?: string; uri: string }[]) => playlists.map(toRef)),
      getItems: (params: { uri: string }) =>
        mopidy.playlists
          .lookup({ uri: params.uri })
          .then((playlist: { tracks: { __model__: string; name?: string; uri: string }[] } | null) =>
            playlist ? playlist.tracks.map(toRef) : playlist,
          ),
      editable: !!mopidy.playlists.asList, // Mopidy >= 1.0
    },
    mixer: {
      getMute: mopidy.playback.getMute,
      setMute: (params: { mute: boolean }) => mopidy.playback.setMute({ value: params.mute }),
      getVolume: mopidy.playback.getVolume,
      setVolume: mopidy.playback.setVolume,
    },
  };
  for (const [key, value] of Object.entries(extensions)) {
    mopidy[key] = Object.assign(value, mopidy[key] || {});
  }
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
          resolve(shim(mopidy));
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
