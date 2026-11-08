/* eslint-disable @typescript-eslint/no-explicit-any -- Mopidy's API is dynamic */
import { TestBed } from '@angular/core/testing';
import Mopidy from 'mopidy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flush } from '../../testing/dom';
import { FakeWebSocket, MOPIDY_0_19_API, MOPIDY_API, createMopidyApi, track } from '../../testing/mopidy';
import { LoggingService } from './logging.service';
import { ConnectionError, MopidyFactory, MopidySettings, shim } from './mopidy.service';

/** Connect a real Mopidy.js client to a fake WebSocket. */
async function connect(socket: FakeWebSocket): Promise<any> {
  const mopidy: any = new Mopidy({ webSocket: socket, autoConnect: false } as any);
  const online = new Promise<void>((resolve) => mopidy.once('state:online', resolve));
  mopidy.connect();
  socket.open();
  await online;
  return mopidy;
}

describe('shim', () => {
  describe('with a current Mopidy server', () => {
    let socket: FakeWebSocket;
    let mopidy: any;

    beforeEach(async () => {
      socket = new FakeWebSocket(MOPIDY_API);
      mopidy = shim(await connect(socket));
    });

    it('keeps native methods', async () => {
      socket.methods['core.library.lookup'] = ({ uris }) => Object.fromEntries(uris.map((uri: string) => [uri, []]));
      await expect(mopidy.library.lookup({ uris: ['a', 'b'] })).resolves.toEqual({ a: [], b: [] });
      expect(socket.calls).toEqual(['core.library.lookup']);
    });

    it('combines tracklist options', async () => {
      socket.methods['core.tracklist.get_consume'] = () => true;
      socket.methods['core.tracklist.get_random'] = () => false;
      socket.methods['core.tracklist.get_repeat'] = () => true;
      socket.methods['core.tracklist.get_single'] = () => false;
      await expect(mopidy.tracklist.getOptions()).resolves.toEqual({
        consume: true,
        random: false,
        repeat: true,
        single: false,
      });
    });

    it('looks up the current, next and previous track IDs', async () => {
      const current = { tlid: 2, track: track('local:track:2') };
      socket.methods['core.playback.get_current_tl_track'] = () => current;
      socket.methods['core.tracklist.next_track'] = ({ tl_track }) => ({ tlid: tl_track.tlid + 1 });
      socket.methods['core.tracklist.previous_track'] = () => null;
      socket.methods['core.tracklist.eot_track'] = ({ tl_track }) => ({ tlid: tl_track.tlid + 1 });
      await expect(mopidy.playback.getCurrentTlid()).resolves.toBe(2);
      await expect(mopidy.tracklist.getNextTlid()).resolves.toBe(3);
      await expect(mopidy.tracklist.getPreviousTlid()).resolves.toBeNull();
      await expect(mopidy.tracklist.getEotTlid()).resolves.toBe(3);
    });

    it('marks playlists as editable', () => {
      expect(mopidy.playlists.editable).toBe(true);
    });

    it('keeps the native mixer and stream title methods', async () => {
      socket.methods['core.mixer.get_volume'] = () => 42;
      socket.methods['core.playback.get_stream_title'] = () => 'Live';
      await expect(mopidy.mixer.getVolume()).resolves.toBe(42);
      await expect(mopidy.playback.getStreamTitle()).resolves.toBe('Live');
      expect(socket.calls).toEqual(['core.mixer.get_volume', 'core.playback.get_stream_title']);
    });
  });

  describe('with an old Mopidy server', () => {
    let socket: FakeWebSocket;
    let mopidy: any;

    beforeEach(async () => {
      socket = new FakeWebSocket(MOPIDY_0_19_API);
      mopidy = shim(await connect(socket));
    });

    it('emulates library.lookup() with multiple URIs', async () => {
      socket.methods['core.library.lookup'] = ({ uri }) => [track(uri)];
      await expect(mopidy.library.lookup({ uris: ['a', 'b'] })).resolves.toEqual({ a: [track('a')], b: [track('b')] });
      expect(socket.calls).toEqual(['core.library.lookup', 'core.library.lookup']);
      expect(socket.requests.slice(1).map((request) => request.params)).toEqual([{ uri: 'a' }, { uri: 'b' }]);
    });

    it('passes single-URI lookups through', async () => {
      socket.methods['core.library.lookup'] = ({ uri }) => [track(uri)];
      await expect(mopidy.library.lookup({ uri: 'a' })).resolves.toEqual([track('a')]);
    });

    it('emulates tracklist.add() with URIs', async () => {
      socket.methods['core.library.lookup'] = ({ uri }) => [track(uri)];
      socket.methods['core.tracklist.add'] = ({ tracks, at_position }) =>
        tracks.map((t: any, i: number) => ({ tlid: (at_position ?? 0) + i, track: t }));
      const result = await mopidy.tracklist.add({ uris: ['a', 'b'], at_position: 5 });
      expect(result.map((tlTrack: any) => tlTrack.tlid)).toEqual([5, 6]);
      const add = socket.requests.find((request) => request.method === 'core.tracklist.add');
      expect(add?.params).toEqual({ tracks: [track('a'), track('b')], at_position: 5 });
    });

    it('emulates tracklist.add() without a position', async () => {
      socket.methods['core.library.lookup'] = ({ uri }) => [track(uri)];
      socket.methods['core.tracklist.add'] = ({ tracks }) => tracks.map((t: any, i: number) => ({ tlid: i, track: t }));
      await mopidy.tracklist.add({ uris: ['a'] });
      const add = socket.requests.find((request) => request.method === 'core.tracklist.add');
      expect(add?.params).toEqual({ tracks: [track('a')] });
    });

    it('emulates exact searches with library.find_exact()', async () => {
      socket.methods['core.library.find_exact'] = () => [{ tracks: [track('x')] }];
      socket.methods['core.library.search'] = () => [{ tracks: [track('y')] }];
      await expect(mopidy.library.search({ query: { any: ['a'] }, uris: null, exact: true })).resolves.toEqual([
        { tracks: [track('x')] },
      ]);
      await expect(mopidy.library.search({ query: { any: ['a'] }, uris: null, exact: false })).resolves.toEqual([
        { tracks: [track('y')] },
      ]);
      expect(socket.calls).toEqual(['core.library.find_exact', 'core.library.search']);
      expect(socket.requests[1].params).toEqual({ query: { any: ['a'] }, uris: null });
    });

    it('emulates library.get_images() from album images', async () => {
      socket.methods['core.library.lookup'] = ({ uri }) => [
        track(uri, { album: { images: ['http://img/1', 'http://img/2'] } }),
        track(uri, { album: { images: ['http://img/2'] } }),
      ];
      await expect(mopidy.library.getImages({ uris: ['a'] })).resolves.toEqual({
        a: [
          { __model__: 'Image', uri: 'http://img/1' },
          { __model__: 'Image', uri: 'http://img/2' },
        ],
      });
    });

    it('emulates playlists.as_list() and playlists.get_items()', async () => {
      socket.methods['core.playlists.get_playlists'] = () => [{ __model__: 'Playlist', uri: 'm3u:a', name: 'A' }];
      socket.methods['core.playlists.lookup'] = ({ uri }) =>
        uri === 'm3u:a' ? { __model__: 'Playlist', uri, name: 'A', tracks: [track('t')] } : null;
      await expect(mopidy.playlists.asList()).resolves.toEqual([
        { __model__: 'Ref', type: 'playlist', name: 'A', uri: 'm3u:a' },
      ]);
      await expect(mopidy.playlists.getItems({ uri: 'm3u:a' })).resolves.toEqual([
        { __model__: 'Ref', type: 'track', name: 'Track t', uri: 't' },
      ]);
      await expect(mopidy.playlists.getItems({ uri: 'm3u:b' })).resolves.toBeNull();
      expect(mopidy.playlists.editable).toBe(false);
    });

    it('emulates the mixer with playback methods', async () => {
      socket.methods['core.playback.get_volume'] = () => 33;
      socket.methods['core.playback.set_mute'] = ({ value }) => value;
      await expect(mopidy.mixer.getVolume()).resolves.toBe(33);
      await expect(mopidy.mixer.setMute({ mute: true })).resolves.toBe(true);
      expect(socket.requests.at(-1)?.params).toEqual({ value: true });
    });

    it('returns no stream title', async () => {
      await expect(mopidy.playback.getStreamTitle()).resolves.toBeNull();
      expect(socket.calls).toEqual([]);
    });
  });

  it('works on a plain API object', () => {
    const api = createMopidyApi();
    const result = shim(api);
    expect(result).toBe(api);
    expect(typeof result.tracklist.getOptions).toBe('function');
  });
});

describe('MopidyFactory', () => {
  let factory: MopidyFactory;
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    factory = TestBed.inject(MopidyFactory);
    logging = TestBed.inject(LoggingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function settings(socket: FakeWebSocket, extra: MopidySettings = {}): MopidySettings {
    return { webSocketUrl: 'ws://test:6680/mopidy/ws/', webSocket: socket, ...extra } as MopidySettings;
  }

  it('resolves with a shimmed client when online', async () => {
    const socket = new FakeWebSocket();
    const infos = vi.spyOn(logging, 'info');
    const promise = factory.create(settings(socket));
    socket.open();
    const mopidy = await promise;
    expect(typeof mopidy.tracklist.getOptions).toBe('function');
    expect(typeof mopidy.library.lookup).toBe('function');
    expect(infos).toHaveBeenCalledWith('Connecting to ws://test:6680/mopidy/ws/');
    expect(infos).toHaveBeenCalledWith('Connected');
  });

  it('rejects with a connection error when the socket closes', async () => {
    const socket = new FakeWebSocket();
    const promise = factory.create(settings(socket));
    socket.close();
    await expect(promise).rejects.toBeInstanceOf(ConnectionError);
  });

  it('rejects with a connection error on timeout', async () => {
    vi.useFakeTimers();
    try {
      const socket = new FakeWebSocket();
      const promise = factory.create(settings(socket), 1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).rejects.toMatchObject({ name: 'ConnectionError', message: 'Connection timeout' });
      expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not time out once connected', async () => {
    vi.useFakeTimers();
    try {
      const socket = new FakeWebSocket();
      const promise = factory.create(settings(socket), 1000);
      socket.open();
      await vi.advanceTimersByTimeAsync(0);
      const mopidy = await promise;
      vi.advanceTimersByTime(5000);
      expect(mopidy).toBeDefined();
      expect(socket.readyState).toBe(FakeWebSocket.OPEN);
    } finally {
      vi.useRealTimers();
    }
  });

  it('logs the default WebSocket when no URL is given', async () => {
    const socket = new FakeWebSocket();
    const infos = vi.spyOn(logging, 'info');
    const promise = factory.create({ webSocket: socket } as MopidySettings);
    socket.open();
    await promise;
    expect(infos).toHaveBeenCalledWith('Connecting to default WebSocket');
  });

  it('logs messages and events when debugging is enabled', async () => {
    const socket = new FakeWebSocket();
    const debug = vi.spyOn(logging, 'debug');
    logging.debugEnabled = true;
    const promise = factory.create(settings(socket));
    socket.open();
    await promise;
    expect(debug).toHaveBeenCalledWith('state:online');
    const outgoing = debug.mock.calls.find((args) => args[0] === 'websocket:outgoingMessage');
    expect(outgoing?.[1]).toMatchObject({ jsonrpc: '2.0', method: 'core.describe' });
    const incoming = debug.mock.calls.find((args) => args[0] === 'websocket:incomingMessage');
    expect(incoming?.[1]).toMatchObject({ jsonrpc: '2.0', result: expect.any(Object) });
    socket.emit('seeked', { time_position: 1000 });
    await flush();
    expect(debug).toHaveBeenCalledWith('event:seeked', { time_position: 1000 });
  });

  it('does not log messages when debugging is disabled', async () => {
    const socket = new FakeWebSocket();
    const debug = vi.spyOn(logging, 'debug');
    logging.debugEnabled = false;
    const promise = factory.create(settings(socket));
    socket.open();
    await promise;
    expect(debug).not.toHaveBeenCalled();
  });
});
