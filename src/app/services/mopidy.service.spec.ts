/* eslint-disable @typescript-eslint/no-explicit-any -- Mopidy's API is dynamic */
import { TestBed } from '@angular/core/testing';
import Mopidy from 'mopidy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flush } from '../../testing/dom';
import { FakeWebSocket, MOPIDY_API, createMopidyApi, track } from '../../testing/mopidy';
import { LoggingService } from './logging.service';
import { ConnectionError, MopidyFactory, MopidySettings, extend } from './mopidy.service';

/** Connect a real Mopidy.js client to a fake WebSocket. */
async function connect(socket: FakeWebSocket): Promise<any> {
  const mopidy: any = new Mopidy({ webSocket: socket, autoConnect: false } as any);
  const online = new Promise<void>((resolve) => mopidy.once('state:online', resolve));
  mopidy.connect();
  socket.open();
  await online;
  return mopidy;
}

describe('extend', () => {
  let socket: FakeWebSocket;
  let mopidy: any;

  beforeEach(async () => {
    socket = new FakeWebSocket(MOPIDY_API);
    mopidy = extend(await connect(socket));
  });

  it('returns the extended client', async () => {
    const api = createMopidyApi();
    expect(extend(api)).toBe(api);
    expect(typeof api.tracklist.getOptions).toBe('function');
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

  it('looks up the next and previous track IDs', async () => {
    const current = { tlid: 2, track: track('local:track:2') };
    socket.methods['core.playback.get_current_tl_track'] = () => current;
    socket.methods['core.tracklist.next_track'] = ({ tl_track }) => ({ tlid: tl_track.tlid + 1 });
    socket.methods['core.tracklist.previous_track'] = () => null;
    await expect(mopidy.tracklist.getNextTlid()).resolves.toBe(3);
    await expect(mopidy.tracklist.getPreviousTlid()).resolves.toBeNull();
    expect(socket.requests.filter((r) => r.method === 'core.tracklist.next_track')[0].params).toEqual({
      tl_track: current,
    });
  });

  it('looks up track IDs relative to the end of the tracklist when nothing is playing', async () => {
    socket.methods['core.playback.get_current_tl_track'] = () => null;
    socket.methods['core.tracklist.next_track'] = ({ tl_track }) => (tl_track === null ? { tlid: 1 } : null);
    await expect(mopidy.tracklist.getNextTlid()).resolves.toBe(1);
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

  it('resolves with an extended client when online', async () => {
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

  it('does not reconnect after the connection failed', async () => {
    vi.useFakeTimers();
    try {
      const connect = vi.spyOn(Mopidy.prototype as any, 'connect');
      const socket = new FakeWebSocket();
      const promise = factory.create(settings(socket));
      socket.close();
      await expect(promise).rejects.toBeInstanceOf(ConnectionError);
      await vi.advanceTimersByTimeAsync(10000);
      expect(connect).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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
