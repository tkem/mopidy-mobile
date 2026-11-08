import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { flush } from '../../testing/dom';
import { image, tlTrack } from '../../testing/mopidy';
import { CoverartService } from './coverart.service';
import { LoggingService } from './logging.service';
import { MixerService, PlaybackService } from './playback.service';
import { PlatformService } from './platform.service';

describe('PlaybackService', () => {
  let service: PlaybackService;
  let connection: MockConnectionService;
  let coverart: { getImage: ReturnType<typeof vi.fn> };
  let platform: Record<string, ReturnType<typeof vi.fn>>;
  let splashscreen: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    connection = new MockConnectionService();
    coverart = { getImage: vi.fn().mockResolvedValue(null) };
    splashscreen = { show: vi.fn(), hide: vi.fn() };
    platform = {
      updatePlaybackControls: vi.fn().mockResolvedValue(undefined),
      updatePlaybackState: vi.fn().mockResolvedValue(undefined),
      splashscreen: vi.fn().mockResolvedValue(splashscreen),
    };
    TestBed.configureTestingModule({
      providers: [
        provideMockConnection(connection),
        { provide: CoverartService, useValue: coverart },
        { provide: PlatformService, useValue: platform },
      ],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    vi.spyOn(logging, 'error');
    service = TestBed.inject(PlaybackService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts with an empty state', () => {
    expect(service.track()).toBeNull();
    expect(service.image()).toBeNull();
    expect(service.state()).toBe('stopped');
    expect(service.options()).toEqual({});
    expect(service.position()).toBe(0);
    expect(service.hasNext()).toBe(false);
    expect(service.hasPrevious()).toBe(false);
    expect(service.streamTitle()).toBeNull();
  });

  describe('reload', () => {
    it('loads the current playback state', async () => {
      const current = tlTrack(3);
      connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(current);
      connection.mopidy.playback.getState.mockResolvedValue('paused');
      connection.mopidy.playback.getTimePosition.mockResolvedValue(42000);
      connection.mopidy.tracklist.getOptions.mockResolvedValue({ random: true });
      connection.mopidy.tracklist.getNextTlid.mockResolvedValue(4);
      connection.mopidy.tracklist.getPreviousTlid.mockResolvedValue(2);
      connection.mopidy.playback.getStreamTitle.mockResolvedValue('Stream');
      await service.reload();
      expect(service.track()).toEqual(current.track);
      expect(service.state()).toBe('paused');
      expect(service.position()).toBe(42000);
      expect(service.options()).toEqual({ random: true });
      expect(service.hasNext()).toBe(true);
      expect(service.hasPrevious()).toBe(true);
      expect(service.streamTitle()).toBe('Stream');
    });

    it('shows the end-of-tracklist track when nothing is playing', async () => {
      const eot = tlTrack(7);
      connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(null);
      connection.mopidy.tracklist.eotTrack.mockResolvedValue(eot);
      await service.reload();
      expect(connection.mopidy.tracklist.eotTrack).toHaveBeenCalledWith({ tl_track: null });
      expect(service.track()).toEqual(eot.track);
    });

    it('loads cover art for the current track', async () => {
      const current = tlTrack(3);
      connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(current);
      coverart.getImage.mockResolvedValue(image('cover', 500));
      await service.reload();
      await flush();
      expect(coverart.getImage).toHaveBeenCalledWith(current.track);
      expect(service.image()).toEqual(image('cover', 500));
      expect(platform.updatePlaybackControls).toHaveBeenLastCalledWith(
        expect.objectContaining({ track: current.track, image: image('cover', 500) }),
      );
    });

    it('advances the position while playing', async () => {
      vi.useFakeTimers();
      connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(tlTrack(1, 'local:track:1', { length: 10000 }));
      connection.mopidy.playback.getState.mockResolvedValue('playing');
      connection.mopidy.playback.getTimePosition.mockResolvedValue(5000);
      const promise = service.reload();
      await vi.advanceTimersByTimeAsync(0);
      await promise;
      expect(service.position()).toBe(5000);
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.position()).toBe(6000);
      await vi.advanceTimersByTimeAsync(10000);
      expect(service.position()).toBe(10000);
    });

    it('keeps the position when paused', async () => {
      vi.useFakeTimers();
      connection.mopidy.playback.getState.mockResolvedValue('paused');
      connection.mopidy.playback.getTimePosition.mockResolvedValue(5000);
      const promise = service.reload();
      await vi.advanceTimersByTimeAsync(0);
      await promise;
      await vi.advanceTimersByTimeAsync(3000);
      expect(service.position()).toBe(5000);
    });

    it('logs errors', async () => {
      const error = new Error('offline');
      connection.fail(error);
      await service.reload();
      expect(logging.warn).toHaveBeenCalledWith('Error loading playback state', error);
    });
  });

  describe('start', () => {
    it('loads the state once and hides the splash screen', async () => {
      vi.useFakeTimers();
      service.start();
      service.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(connection.mopidy.playback.getState).toHaveBeenCalledTimes(1);
      expect(splashscreen.hide).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(250);
      expect(splashscreen.hide).toHaveBeenCalledTimes(1);
    });

    it('reloads when the connection comes online', async () => {
      connection.emit('state:online');
      await flush();
      expect(connection.mopidy.playback.getState).toHaveBeenCalledTimes(1);
    });
  });

  describe('events', () => {
    it('updates the playback state', async () => {
      connection.emit('event:playbackStateChanged', { old_state: 'stopped', new_state: 'playing' });
      expect(service.state()).toBe('playing');
      await flush();
      expect(platform.updatePlaybackState).toHaveBeenCalledWith('playing');
    });

    it('tracks the position across play, pause, seek and resume', async () => {
      vi.useFakeTimers();
      connection.emit('event:trackPlaybackStarted', { tl_track: tlTrack(1, 'local:track:1', { length: 60000 }) });
      await vi.advanceTimersByTimeAsync(0);
      expect(service.position()).toBe(0);
      connection.emit('event:playbackStateChanged', { old_state: 'stopped', new_state: 'playing' });
      await vi.advanceTimersByTimeAsync(2000);
      expect(service.position()).toBe(2000);
      connection.emit('event:trackPlaybackPaused', { tl_track: tlTrack(1), time_position: 2500 });
      connection.emit('event:playbackStateChanged', { old_state: 'playing', new_state: 'paused' });
      await vi.advanceTimersByTimeAsync(2000);
      expect(service.position()).toBe(2500);
      connection.emit('event:seeked', { time_position: 30000 });
      expect(service.position()).toBe(30000);
      connection.emit('event:trackPlaybackResumed', { tl_track: tlTrack(1), time_position: 30000 });
      connection.emit('event:playbackStateChanged', { old_state: 'paused', new_state: 'playing' });
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.position()).toBe(31000);
      connection.emit('event:trackPlaybackEnded', { tl_track: tlTrack(1), time_position: 60000 });
      expect(service.position()).toBe(0);
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.position()).toBe(0);
    });

    it('sets the current track when playback starts', async () => {
      const current = tlTrack(2);
      connection.mopidy.tracklist.getNextTlid.mockResolvedValue(3);
      connection.mopidy.tracklist.getPreviousTlid.mockResolvedValue(null);
      connection.emit('event:trackPlaybackStarted', { tl_track: current });
      await flush();
      expect(service.track()).toEqual(current.track);
      expect(service.hasNext()).toBe(true);
      expect(service.hasPrevious()).toBe(false);
      expect(platform.updatePlaybackControls).toHaveBeenCalledWith(
        expect.objectContaining({ track: current.track, hasNext: true, hasPrevious: false }),
      );
    });

    it('updates the stream title', async () => {
      connection.emit('event:streamTitleChanged', { title: 'Now playing' });
      expect(service.streamTitle()).toBe('Now playing');
      await flush();
      expect(platform.updatePlaybackControls).toHaveBeenCalledWith(expect.objectContaining({ streamTitle: 'Now playing' }));
    });

    it('refreshes the current track when the tracklist changes', async () => {
      const current = tlTrack(5);
      connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(current);
      connection.emit('event:tracklistChanged');
      await flush();
      expect(service.track()).toEqual(current.track);
    });

    it('ignores outdated track updates', async () => {
      let resolveNext!: (value: number | null) => void;
      connection.mopidy.tracklist.getNextTlid.mockReturnValueOnce(new Promise((r) => (resolveNext = r)));
      const first = tlTrack(1);
      const second = tlTrack(2);
      connection.emit('event:trackPlaybackStarted', { tl_track: first });
      connection.emit('event:trackPlaybackStarted', { tl_track: second });
      await flush();
      expect(service.track()).toEqual(second.track);
      resolveNext(99);
      await flush();
      expect(service.track()).toEqual(second.track);
      expect(service.hasNext()).toBe(false);
    });

    it('drops cover art of a superseded track', async () => {
      let resolveImage!: (value: unknown) => void;
      coverart.getImage.mockImplementationOnce(() => new Promise((r) => (resolveImage = r)));
      connection.emit('event:trackPlaybackStarted', { tl_track: tlTrack(1) });
      await flush();
      connection.emit('event:trackPlaybackStarted', { tl_track: tlTrack(2) });
      await flush();
      resolveImage(image('old', 64));
      await flush();
      expect(service.image()).toBeNull();
    });

    it('updates tracklist options', async () => {
      connection.mopidy.tracklist.getOptions.mockResolvedValue({ repeat: true, single: true });
      connection.emit('event:optionsChanged');
      await flush();
      expect(service.options()).toEqual({ repeat: true, single: true });
    });

    it('logs errors from the platform', async () => {
      platform.updatePlaybackState.mockRejectedValue('plugin error');
      connection.emit('event:playbackStateChanged', { old_state: 'stopped', new_state: 'playing' });
      await flush();
      expect(logging.error).toHaveBeenCalledWith('Error updating playback controls:', 'plugin error');
    });
  });

  describe('controls', () => {
    it('plays, pauses and stops', async () => {
      await service.play();
      await service.pause();
      await service.stop();
      expect(connection.mopidy.playback.play).toHaveBeenCalledWith();
      expect(connection.mopidy.playback.pause).toHaveBeenCalled();
      expect(connection.mopidy.playback.stop).toHaveBeenCalled();
    });

    it('toggles between play and pause', async () => {
      await service.togglePlay();
      expect(connection.mopidy.playback.play).toHaveBeenCalledTimes(1);
      service.state.set('playing');
      await service.togglePlay();
      expect(connection.mopidy.playback.pause).toHaveBeenCalledTimes(1);
      service.state.set('paused');
      await service.togglePlay();
      expect(connection.mopidy.playback.play).toHaveBeenCalledTimes(2);
    });

    it('skips to the next and previous track', async () => {
      service.state.set('playing');
      await service.next();
      await service.previous();
      expect(connection.mopidy.playback.next).toHaveBeenCalled();
      expect(connection.mopidy.playback.previous).toHaveBeenCalled();
      expect(connection.mopidy.playback.getCurrentTlTrack).not.toHaveBeenCalled();
    });

    it('refreshes the current track when skipping while stopped', async () => {
      const current = tlTrack(2);
      connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(current);
      await service.next();
      await flush();
      expect(service.track()).toEqual(current.track);
      connection.mopidy.playback.getCurrentTlTrack.mockResolvedValue(tlTrack(1));
      await service.previous();
      await flush();
      expect(service.track()).toEqual(tlTrack(1).track);
    });

    it('toggles random mode', async () => {
      await service.toggleRandom();
      expect(connection.mopidy.tracklist.setRandom).toHaveBeenCalledWith({ value: true });
      service.options.set({ random: true });
      await service.toggleRandom();
      expect(connection.mopidy.tracklist.setRandom).toHaveBeenCalledWith({ value: false });
    });

    it('cycles through repeat modes', async () => {
      await service.toggleRepeat();
      expect(connection.mopidy.tracklist.setRepeat).toHaveBeenCalledWith({ value: true });
      expect(connection.mopidy.tracklist.setSingle).not.toHaveBeenCalled();
      service.options.set({ repeat: true });
      await service.toggleRepeat();
      expect(connection.mopidy.tracklist.setSingle).toHaveBeenCalledWith({ value: true });
      service.options.set({ repeat: true, single: true });
      await service.toggleRepeat();
      expect(connection.mopidy.tracklist.setRepeat).toHaveBeenCalledWith({ value: false });
      expect(connection.mopidy.tracklist.setSingle).toHaveBeenCalledWith({ value: false });
    });

    it('seeks to a position', async () => {
      await service.seek(1234.6);
      expect(service.position()).toBe(1234.6);
      expect(connection.mopidy.playback.seek).toHaveBeenCalledWith({ time_position: 1235 });
    });

    it('does not update the position while seeking', async () => {
      vi.useFakeTimers();
      connection.emit('event:trackPlaybackStarted', { tl_track: tlTrack(1, 'local:track:1', { length: 60000 }) });
      connection.emit('event:playbackStateChanged', { old_state: 'stopped', new_state: 'playing' });
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.position()).toBe(1000);
      service.seekStart();
      await vi.advanceTimersByTimeAsync(2000);
      expect(service.position()).toBe(1000);
      let resolveSeek!: (value: unknown) => void;
      connection.mopidy.playback.seek.mockReturnValueOnce(new Promise((r) => (resolveSeek = r)));
      const promise = service.seek(30000);
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.position()).toBe(30000);
      resolveSeek(true);
      await promise;
      connection.emit('event:seeked', { time_position: 30000 });
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.position()).toBe(31000);
    });
  });
});

describe('MixerService', () => {
  let service: MixerService;
  let connection: MockConnectionService;
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    connection = new MockConnectionService();
    TestBed.configureTestingModule({ providers: [provideMockConnection(connection)] });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    service = TestBed.inject(MixerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the mixer state once on start', async () => {
    connection.mopidy.mixer.getMute.mockResolvedValue(true);
    connection.mopidy.mixer.getVolume.mockResolvedValue(70);
    service.start();
    service.start();
    await flush();
    expect(service.mute()).toBe(true);
    expect(service.volume()).toBe(70);
    expect(connection.mopidy.mixer.getVolume).toHaveBeenCalledTimes(1);
  });

  it('reloads when the connection comes online', async () => {
    connection.mopidy.mixer.getVolume.mockResolvedValue(30);
    connection.emit('state:online');
    await flush();
    expect(service.volume()).toBe(30);
  });

  it('logs errors when loading fails', async () => {
    const error = new Error('offline');
    connection.fail(error);
    await service.reload();
    expect(logging.warn).toHaveBeenCalledWith('Error loading mixer state', error);
  });

  it('follows mute and volume events', () => {
    connection.emit('event:muteChanged', { mute: true });
    expect(service.mute()).toBe(true);
    connection.emit('event:volumeChanged', { volume: 80 });
    expect(service.volume()).toBe(80);
  });

  it('sets the mute state', async () => {
    await service.setMute(true);
    expect(connection.mopidy.mixer.setMute).toHaveBeenCalledWith({ mute: true });
  });

  it('sets the volume, coalescing changes while a request is pending', async () => {
    let resolveFirst!: (value: unknown) => void;
    connection.mopidy.mixer.setVolume.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)));
    service.setVolume(10.4);
    expect(service.volume()).toBe(10);
    await flush();
    expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledTimes(1);
    expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledWith({ volume: 10 });
    service.setVolume(20);
    service.setVolume(30);
    connection.emit('event:volumeChanged', { volume: 10 });
    expect(service.volume()).toBe(30);
    await flush();
    expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledTimes(1);
    resolveFirst(true);
    await flush();
    expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledTimes(2);
    expect(connection.mopidy.mixer.setVolume).toHaveBeenLastCalledWith({ volume: 30 });
    await flush();
    connection.emit('event:volumeChanged', { volume: 31 });
    expect(service.volume()).toBe(31);
  });

  it('accepts new changes after a failed request', async () => {
    connection.mopidy.mixer.setVolume.mockRejectedValueOnce(new Error('fail'));
    service.setVolume(10);
    await flush();
    service.setVolume(20);
    await flush();
    expect(connection.mopidy.mixer.setVolume).toHaveBeenCalledTimes(2);
    expect(connection.mopidy.mixer.setVolume).toHaveBeenLastCalledWith({ volume: 20 });
  });
});
