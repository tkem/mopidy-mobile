import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { flush } from '../../testing/dom';
import { image, tlTrack } from '../../testing/mopidy';
import { Model } from '../models';
import { THUMBNAIL_SIZE } from '../shared/thumbnail.component';
import { CoverartService } from './coverart.service';
import { LoggingService } from './logging.service';
import { PopupService } from './popup.service';
import { TracklistService } from './tracklist.service';

describe('TracklistService', () => {
  let service: TracklistService;
  let connection: MockConnectionService;
  let coverart: { getImages: ReturnType<typeof vi.fn> };
  let popup: { confirm: ReturnType<typeof vi.fn>; prompt: ReturnType<typeof vi.fn> };
  let logging: LoggingService;

  const tlTracks = [tlTrack(1), tlTrack(2), tlTrack(3)];

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    connection = new MockConnectionService();
    coverart = {
      getImages: vi.fn((models: Model[]) =>
        Promise.resolve(Object.fromEntries(models.map((model) => [model.uri, image(model.uri, 64)]))),
      ),
    };
    popup = { confirm: vi.fn().mockResolvedValue(false), prompt: vi.fn().mockResolvedValue(null) };
    TestBed.configureTestingModule({
      providers: [
        provideMockConnection(connection),
        { provide: CoverartService, useValue: coverart },
        { provide: PopupService, useValue: popup },
      ],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    vi.spyOn(logging, 'error');
    service = TestBed.inject(TracklistService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the tracklist once on start', async () => {
    connection.mopidy.tracklist.getTlTracks.mockResolvedValue(tlTracks);
    connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(tlTracks[1]);
    connection.mopidy.tracklist.getOptions.mockResolvedValue({ consume: true });
    service.start();
    service.start();
    await flush();
    expect(service.tlTracks()).toEqual(tlTracks);
    expect(service.currentTlTrack()).toEqual(tlTracks[1]);
    expect(service.currentIndex()).toBe(1);
    expect(service.options()).toEqual({ consume: true });
    expect(connection.mopidy.tracklist.getTlTracks).toHaveBeenCalledTimes(1);
  });

  it('has no current index without a current track', async () => {
    connection.mopidy.tracklist.getTlTracks.mockResolvedValue(tlTracks);
    await service.reload();
    expect(service.currentIndex()).toBe(-1);
    service.currentTlTrack.set(tlTrack(99));
    expect(service.currentIndex()).toBe(-1);
  });

  it('loads thumbnails page by page', async () => {
    const many = Array.from({ length: 25 }, (_, i) => tlTrack(i + 1));
    connection.mopidy.tracklist.getTlTracks.mockResolvedValue(many);
    await service.reload();
    await flush();
    expect(coverart.getImages).toHaveBeenCalledTimes(3);
    expect(coverart.getImages.mock.calls.map(([models]) => models.length)).toEqual([10, 10, 5]);
    expect(coverart.getImages).toHaveBeenCalledWith(expect.anything(), THUMBNAIL_SIZE);
    expect(Object.keys(service.images())).toHaveLength(25);
    expect(service.images()['local:track:7']).toEqual(image('local:track:7', 64));
  });

  it('keeps thumbnails of tracks still in the tracklist', async () => {
    connection.mopidy.tracklist.getTlTracks.mockResolvedValue(tlTracks);
    await service.reload();
    await flush();
    coverart.getImages.mockClear();
    connection.mopidy.tracklist.getTlTracks.mockResolvedValue([tlTracks[2], tlTrack(4)]);
    connection.emit('event:tracklistChanged');
    await flush();
    expect(service.tlTracks()).toEqual([tlTracks[2], tlTrack(4)]);
    expect(coverart.getImages).toHaveBeenCalledTimes(1);
    expect(coverart.getImages.mock.calls[0][0]).toEqual([tlTrack(4).track]);
    expect(Object.keys(service.images()).sort()).toEqual(['local:track:3', 'local:track:4']);
  });

  it('logs thumbnail loading errors', async () => {
    const error = new Error('no images');
    coverart.getImages.mockRejectedValue(error);
    connection.mopidy.tracklist.getTlTracks.mockResolvedValue(tlTracks);
    await service.reload();
    await flush();
    expect(logging.error).toHaveBeenCalledWith('Error loading cover art', error);
  });

  it('follows playback and option events', async () => {
    connection.emit('event:trackPlaybackStarted', { tl_track: tlTracks[0] });
    expect(service.currentTlTrack()).toEqual(tlTracks[0]);
    connection.emit('event:trackPlaybackEnded', { tl_track: tlTracks[0], time_position: 0 });
    expect(service.currentTlTrack()).toBeNull();
    connection.mopidy.tracklist.getOptions.mockResolvedValue({ random: true });
    connection.emit('event:optionsChanged');
    await flush();
    expect(service.options()).toEqual({ random: true });
  });

  it('reloads when the connection comes online', async () => {
    connection.mopidy.tracklist.getTlTracks.mockResolvedValue(tlTracks);
    connection.emit('state:online');
    await flush();
    expect(service.tlTracks()).toEqual(tlTracks);
  });

  it('logs errors when loading fails', async () => {
    const error = new Error('offline');
    connection.fail(error);
    await service.reload();
    expect(logging.warn).toHaveBeenCalledWith('Error loading tracklist', error);
  });

  it('adds, clears and plays', async () => {
    await service.add('http://stream');
    expect(connection.mopidy.tracklist.add).toHaveBeenCalledWith({ uris: ['http://stream'] });
    await service.clear();
    expect(connection.mopidy.tracklist.clear).toHaveBeenCalled();
    await service.play(tlTracks[1]);
    expect(connection.mopidy.playback.play).toHaveBeenCalledWith({ tlid: 2 });
  });

  it('moves tracks, updating the local copy first', async () => {
    service.tlTracks.set(tlTracks);
    const promise = service.move(0, 2);
    expect(service.tlTracks().map((t) => t.tlid)).toEqual([2, 3, 1]);
    await promise;
    expect(connection.mopidy.tracklist.move).toHaveBeenCalledWith({ start: 0, end: 1, to_position: 2 });
  });

  it('removes tracks, updating the local copy first', async () => {
    service.tlTracks.set(tlTracks);
    const promise = service.remove(tlTracks[1]);
    expect(service.tlTracks().map((t) => t.tlid)).toEqual([1, 3]);
    await promise;
    expect(connection.mopidy.tracklist.remove).toHaveBeenCalledWith({ criteria: { tlid: [2] } });
  });

  it('clears the tracklist after confirmation', async () => {
    await service.confirmClear();
    expect(popup.confirm).toHaveBeenCalledWith('Clear tracklist');
    expect(connection.mopidy.tracklist.clear).not.toHaveBeenCalled();
    popup.confirm.mockResolvedValue(true);
    await service.confirmClear();
    expect(connection.mopidy.tracklist.clear).toHaveBeenCalledTimes(1);
  });

  it('saves the tracklist as a new playlist', async () => {
    service.tlTracks.set(tlTracks);
    await service.saveAs();
    expect(popup.prompt).toHaveBeenCalledWith('Playlist Name', 'My Playlist');
    expect(connection.mopidy.playlists.create).not.toHaveBeenCalled();
    popup.prompt.mockResolvedValue('Favourites');
    await service.saveAs();
    expect(connection.mopidy.playlists.create).toHaveBeenCalledWith({ name: 'Favourites' });
    expect(connection.mopidy.playlists.save).toHaveBeenCalledWith({
      playlist: expect.objectContaining({ name: 'Favourites', tracks: tlTracks.map((t) => t.track) }),
    });
  });

  it('toggles tracklist options', async () => {
    service.options.set({ consume: true, random: false, repeat: true, single: false });
    await service.toggleConsume();
    await service.toggleRandom();
    await service.toggleRepeat();
    await service.toggleSingle();
    expect(connection.mopidy.tracklist.setConsume).toHaveBeenCalledWith({ value: false });
    expect(connection.mopidy.tracklist.setRandom).toHaveBeenCalledWith({ value: true });
    expect(connection.mopidy.tracklist.setRepeat).toHaveBeenCalledWith({ value: false });
    expect(connection.mopidy.tracklist.setSingle).toHaveBeenCalledWith({ value: true });
  });
});
