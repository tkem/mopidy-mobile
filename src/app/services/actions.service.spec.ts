import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { tlTrack, track } from '../../testing/mopidy';
import { ActionsService } from './actions.service';

describe('ActionsService', () => {
  let service: ActionsService;
  let connection: MockConnectionService;

  const a = track('local:track:a');
  const b = track('local:track:b');

  beforeEach(() => {
    connection = new MockConnectionService();
    TestBed.configureTestingModule({ providers: [provideMockConnection(connection)] });
    service = TestBed.inject(ActionsService);
  });

  it('adds a single item to the tracklist', async () => {
    connection.mopidy.tracklist.add.mockResolvedValue([tlTrack(1)]);
    await expect(service.add(a)).resolves.toEqual([tlTrack(1)]);
    expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({ uris: ['local:track:a'] });
  });

  it('adds multiple items to the tracklist', async () => {
    await service.add([a, b]);
    expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({ uris: ['local:track:a', 'local:track:b'] });
  });

  it('plays items after the current track', async () => {
    connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(tlTrack(5));
    connection.mopidy.tracklist.index.mockResolvedValue(2);
    connection.mopidy.tracklist.add.mockResolvedValue([tlTrack(7, a.uri), tlTrack(8, b.uri)]);
    await service.play([a, b]);
    expect(connection.mopidy.tracklist.index).toHaveBeenCalledWith({ tl_track: tlTrack(5) });
    expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({
      uris: ['local:track:a', 'local:track:b'],
      at_position: 3,
    });
    expect(connection.mopidy.playback.play).toHaveBeenCalledWith({ tlid: 7 });
  });

  it('plays items at the end when nothing is playing', async () => {
    connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(null);
    connection.mopidy.tracklist.add.mockResolvedValue([tlTrack(1, a.uri)]);
    await service.play(a);
    expect(connection.mopidy.tracklist.index).not.toHaveBeenCalled();
    expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({ uris: ['local:track:a'] });
    expect(connection.mopidy.playback.play).toHaveBeenCalledWith({ tlid: 1 });
  });

  it('queues items after the current track without playing', async () => {
    connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(tlTrack(5));
    connection.mopidy.tracklist.index.mockResolvedValue(0);
    connection.mopidy.tracklist.add.mockResolvedValue([tlTrack(6, a.uri)]);
    await expect(service.next(a)).resolves.toEqual([tlTrack(6, a.uri)]);
    expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({ uris: ['local:track:a'], at_position: 1 });
    expect(connection.mopidy.playback.play).not.toHaveBeenCalled();
  });

  it('replaces the tracklist and starts playback', async () => {
    const order: string[] = [];
    connection.mopidy.tracklist.clear.mockImplementation(() => {
      order.push('clear');
      return Promise.resolve(null);
    });
    connection.mopidy.tracklist.add.mockImplementation(() => {
      order.push('add');
      return Promise.resolve([tlTrack(1, a.uri), tlTrack(2, b.uri)]);
    });
    connection.mopidy.playback.play.mockImplementation(() => {
      order.push('play');
      return Promise.resolve(null);
    });
    await service.replace([a, b]);
    expect(order).toEqual(['clear', 'add', 'play']);
    expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({ uris: ['local:track:a', 'local:track:b'] });
    expect(connection.mopidy.playback.play).toHaveBeenCalledWith({ tlid: 1 });
  });

  it('adds items to a playlist', async () => {
    const existing = track('local:track:old');
    connection.mopidy.library.lookup.mockResolvedValue({ 'local:track:a': [a] });
    connection.mopidy.playlists.lookup.mockResolvedValue({ uri: 'm3u:test', name: 'Test', tracks: [existing] });
    await service.addToPlaylist('m3u:test', a);
    expect(connection.mopidy.library.lookup).toHaveBeenCalledWith({ uris: ['local:track:a'] });
    expect(connection.mopidy.playlists.lookup).toHaveBeenCalledWith({ uri: 'm3u:test' });
    expect(connection.mopidy.playlists.save).toHaveBeenCalledWith({
      playlist: { uri: 'm3u:test', name: 'Test', tracks: [existing, a] },
    });
  });

  it('handles playlists without tracks and items without lookup results', async () => {
    connection.mopidy.library.lookup.mockResolvedValue({});
    connection.mopidy.playlists.lookup.mockResolvedValue({ uri: 'm3u:test', name: 'Test' });
    await service.addToPlaylist('m3u:test', a);
    expect(connection.mopidy.playlists.save).toHaveBeenCalledWith({
      playlist: { uri: 'm3u:test', name: 'Test', tracks: [] },
    });
  });

  describe('volume', () => {
    it('increases the volume by the volume step', async () => {
      connection.mopidy.mixer.getVolume.mockResolvedValue(50);
      await service.increaseVolume();
      expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledWith({ volume: 60 });
    });

    it('does not exceed the maximum volume', async () => {
      connection.mopidy.mixer.getVolume.mockResolvedValue(95);
      await service.increaseVolume();
      expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledWith({ volume: 100 });
      connection.mopidy.mixer.setVolume.mockClear();
      connection.mopidy.mixer.getVolume.mockResolvedValue(100);
      await service.increaseVolume();
      expect(connection.mopidy.mixer.setVolume).not.toHaveBeenCalled();
    });

    it('decreases the volume by the volume step', async () => {
      service.setVolumeStep(5);
      expect(service.getVolumeStep()).toBe(5);
      connection.mopidy.mixer.getVolume.mockResolvedValue(50);
      await service.decreaseVolume();
      expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledWith({ volume: 45 });
    });

    it('does not go below zero', async () => {
      connection.mopidy.mixer.getVolume.mockResolvedValue(3);
      await service.decreaseVolume();
      expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledWith({ volume: 0 });
      connection.mopidy.mixer.setVolume.mockClear();
      connection.mopidy.mixer.getVolume.mockResolvedValue(0);
      await service.decreaseVolume();
      expect(connection.mopidy.mixer.setVolume).not.toHaveBeenCalled();
    });
  });

  describe('default action', () => {
    it('plays by default', async () => {
      expect(service.getDefault()).toBe('play');
      connection.mopidy.tracklist.add.mockResolvedValue([tlTrack(1, a.uri)]);
      await service.default(a);
      expect(connection.mopidy.playback.play).toHaveBeenCalledWith({ tlid: 1 });
    });

    it('performs the configured action', async () => {
      service.setDefault('add');
      expect(service.getDefault()).toBe('add');
      await service.default([a, b]);
      expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({ uris: ['local:track:a', 'local:track:b'] });
      expect(connection.mopidy.playback.play).not.toHaveBeenCalled();
    });

    it('ignores invalid actions', () => {
      service.setDefault('next');
      service.setDefault('delete-everything');
      expect(service.getDefault()).toBe('next');
    });
  });

  it('propagates request failures', async () => {
    const error = new Error('offline');
    connection.fail(error);
    await expect(service.add(a)).rejects.toBe(error);
  });
});
