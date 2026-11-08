/* eslint-disable @typescript-eslint/no-explicit-any -- Mopidy's API is dynamic */
import { vi } from 'vitest';

import { Image, Ref, TlTrack, Track, TracklistOptions } from '../app/models';

/** Create a track model for tests. */
export function track(uri: string, overrides: Partial<Track> = {}): Track {
  return { __model__: 'Track', uri, name: 'Track ' + uri, length: 180000, ...overrides };
}

/** Create a library ref for tests. */
export function ref(uri: string, type = 'track', overrides: Partial<Ref> = {}): Ref {
  return { __model__: 'Ref', uri, name: 'Ref ' + uri, type, ...overrides };
}

/** Create a tracklist track for tests. */
export function tlTrack(tlid: number, uri = `local:track:${tlid}`, overrides: Partial<Track> = {}): TlTrack {
  return { tlid, track: track(uri, overrides) };
}

/** Create an image for tests. */
export function image(uri: string, width?: number, height = width): Image {
  return width === undefined ? { uri } : { uri, width, height };
}

/**
 * A fake Mopidy client API, as seen by the application after `shim()`.
 *
 * All methods are `vi.fn()` mocks resolving to sensible defaults, which
 * tests may override with `mockResolvedValue()` etc.
 */
export function createMopidyApi(): any {
  const resolved = (value: unknown) => vi.fn().mockResolvedValue(value);
  const options: TracklistOptions = { consume: false, random: false, repeat: false, single: false };
  const api = {
    library: {
      browse: resolved([]),
      getImages: resolved({}),
      lookup: resolved({}),
      refresh: resolved(null),
      search: resolved([]),
    },
    tracklist: {
      add: resolved([]),
      clear: resolved(null),
      eotTrack: resolved(null),
      getNextTlid: resolved(null),
      getOptions: resolved(options),
      getPreviousTlid: resolved(null),
      getTlTracks: resolved([]),
      index: resolved(null),
      move: resolved(null),
      remove: resolved([]),
      setConsume: resolved(null),
      setRandom: resolved(null),
      setRepeat: resolved(null),
      setSingle: resolved(null),
    },
    playback: {
      getCurrentTlTrack: resolved(null),
      getState: resolved('stopped'),
      getStreamTitle: resolved(null),
      getTimePosition: resolved(0),
      next: resolved(null),
      pause: resolved(null),
      play: resolved(null),
      previous: resolved(null),
      seek: resolved(true),
      stop: resolved(null),
    },
    playlists: {
      asList: resolved([]),
      create: vi.fn().mockImplementation(({ name }: { name: string }) =>
        Promise.resolve({ __model__: 'Playlist', uri: 'm3u:' + name + '.m3u', name, tracks: [] }),
      ),
      delete: resolved(true),
      editable: true,
      getItems: resolved([]),
      lookup: resolved(null),
      refresh: resolved(null),
      save: vi.fn().mockImplementation(({ playlist }: { playlist: unknown }) => Promise.resolve(playlist)),
    },
    mixer: {
      getMute: resolved(false),
      getVolume: resolved(50),
      setMute: resolved(true),
      setVolume: resolved(true),
    },
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    close: vi.fn(),
    connect: vi.fn(),
  };
  return api;
}

type MethodSpec = Record<string, { description: string; params: { name: string }[] }>;

/** The API description of a Mopidy 3.x server, as returned by `core.describe`. */
export const MOPIDY_API: MethodSpec = {
  'core.get_version': { description: '', params: [] },
  'core.library.browse': { description: '', params: [{ name: 'uri' }] },
  'core.library.get_images': { description: '', params: [{ name: 'uris' }] },
  'core.library.lookup': { description: '', params: [{ name: 'uris' }] },
  'core.library.refresh': { description: '', params: [{ name: 'uri' }] },
  'core.library.search': { description: '', params: [{ name: 'query' }, { name: 'uris' }, { name: 'exact' }] },
  'core.mixer.get_mute': { description: '', params: [] },
  'core.mixer.set_mute': { description: '', params: [{ name: 'mute' }] },
  'core.mixer.get_volume': { description: '', params: [] },
  'core.mixer.set_volume': { description: '', params: [{ name: 'volume' }] },
  'core.playback.get_current_tl_track': { description: '', params: [] },
  'core.playback.get_state': { description: '', params: [] },
  'core.playback.get_stream_title': { description: '', params: [] },
  'core.playback.get_time_position': { description: '', params: [] },
  'core.playback.play': { description: '', params: [{ name: 'tl_track' }, { name: 'tlid' }] },
  'core.playlists.as_list': { description: '', params: [] },
  'core.playlists.get_items': { description: '', params: [{ name: 'uri' }] },
  'core.playlists.lookup': { description: '', params: [{ name: 'uri' }] },
  'core.tracklist.add': { description: '', params: [{ name: 'tracks' }, { name: 'at_position' }, { name: 'uris' }] },
  'core.tracklist.get_consume': { description: '', params: [] },
  'core.tracklist.get_random': { description: '', params: [] },
  'core.tracklist.get_repeat': { description: '', params: [] },
  'core.tracklist.get_single': { description: '', params: [] },
  'core.tracklist.get_tl_tracks': { description: '', params: [] },
  'core.tracklist.eot_track': { description: '', params: [{ name: 'tl_track' }] },
  'core.tracklist.next_track': { description: '', params: [{ name: 'tl_track' }] },
  'core.tracklist.previous_track': { description: '', params: [{ name: 'tl_track' }] },
};

/**
 * The API description of an old (pre-1.0) Mopidy server, lacking newer
 * methods and parameters emulated by `shim()`.
 */
export const MOPIDY_0_19_API: MethodSpec = Object.fromEntries(
  Object.entries({
    ...MOPIDY_API,
    'core.library.lookup': { description: '', params: [{ name: 'uri' }] },
    'core.library.search': { description: '', params: [{ name: 'query' }, { name: 'uris' }] },
    'core.library.find_exact': { description: '', params: [{ name: 'query' }, { name: 'uris' }] },
    'core.tracklist.add': { description: '', params: [{ name: 'tracks' }, { name: 'at_position' }] },
    'core.playlists.get_playlists': { description: '', params: [] },
    'core.playback.get_mute': { description: '', params: [] },
    'core.playback.set_mute': { description: '', params: [{ name: 'value' }] },
    'core.playback.get_volume': { description: '', params: [] },
    'core.playback.set_volume': { description: '', params: [{ name: 'volume' }] },
  }).filter(
    ([name]) =>
      !name.startsWith('core.mixer.') &&
      !['core.library.get_images', 'core.playback.get_stream_title', 'core.playlists.as_list', 'core.playlists.get_items'].includes(name),
  ),
);

interface JsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

/**
 * A fake WebSocket, answering Mopidy JSON-RPC requests in-process.
 *
 * Pass it to the Mopidy.js client via the (undocumented) `webSocket`
 * setting; then call `open()` to simulate a successful connection, or
 * `close()` for a connection failure.
 */
export class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;

  onopen: (() => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;

  /** All JSON-RPC requests sent by the client. */
  readonly requests: JsonRpcRequest[] = [];

  /** Request handlers by fully qualified method name. */
  readonly methods: Record<string, (params?: any) => unknown> = {};

  constructor(readonly api: MethodSpec = MOPIDY_API) {}

  /** The methods called by the client, in order (ignoring `core.describe`). */
  get calls(): string[] {
    return this.requests.map((request) => request.method).filter((method) => method !== 'core.describe');
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  }

  send(data: string): void {
    const request: JsonRpcRequest = JSON.parse(data);
    this.requests.push(request);
    let response: Record<string, unknown>;
    if (request.method === 'core.describe') {
      response = { jsonrpc: '2.0', id: request.id, result: this.api };
    } else if (request.method in this.methods) {
      try {
        response = { jsonrpc: '2.0', id: request.id, result: this.methods[request.method](request.params) ?? null };
      } catch (error) {
        response = { jsonrpc: '2.0', id: request.id, error: { code: 0, message: String(error) } };
      }
    } else {
      response = { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } };
    }
    // respond asynchronously, as a real server would
    queueMicrotask(() => this.receive(response));
  }

  /** Emit a Mopidy event, e.g. `emit('track_playback_started', { tl_track })`. */
  emit(event: string, data: Record<string, unknown> = {}): void {
    this.receive({ event, ...data });
  }

  private receive(message: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }));
  }
}
