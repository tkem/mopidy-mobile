/* eslint-disable @typescript-eslint/no-explicit-any -- Cordova plugin APIs are dynamic */
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flush } from '../../testing/dom';
import { track } from '../../testing/mopidy';
import { LoggingService } from './logging.service';
import { PlaybackControls, PlatformService } from './platform.service';

function controls(overrides: Partial<PlaybackControls> = {}): PlaybackControls {
  return {
    track: track('local:track:1', { name: 'Song', artists: [{ name: 'A' }, { name: 'B' }] }),
    image: { uri: 'http://img/cover.jpg' },
    state: 'playing',
    streamTitle: null,
    hasNext: true,
    hasPrevious: false,
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    ...overrides,
  };
}

describe('PlatformService', () => {
  afterEach(() => {
    document.body.removeAttribute('data-web-socket-url');
    document.body.removeAttribute('data-version');
    vi.restoreAllMocks();
  });

  describe('in a browser', () => {
    let service: PlatformService;

    beforeEach(() => {
      service = TestBed.inject(PlatformService);
    });

    it('is neither hosted nor a WebView', () => {
      expect(service.isHosted()).toBe(false);
      expect(service.webSocketUrl()).toBeNull();
      expect(service.isWebView()).toBe(false);
      expect(service.canShare()).toBe(false);
    });

    it('is ready immediately', async () => {
      await expect(service.ready()).resolves.toBeUndefined();
    });

    it('reports a development version', async () => {
      await expect(service.appVersion()).resolves.toBe('develop');
    });

    it('opens external links in a new window', () => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null);
      service.openExternal('https://example.com/');
      expect(open).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener');
    });

    it('provides no-op splash screen and Zeroconf implementations', async () => {
      const splashscreen = await service.splashscreen();
      expect(() => splashscreen.show()).not.toThrow();
      expect(() => splashscreen.hide()).not.toThrow();
      const zeroconf = await service.zeroconf();
      expect(() => zeroconf.watch('_mopidy-http._tcp.', 'local.', () => undefined)).not.toThrow();
      expect(() => zeroconf.close()).not.toThrow();
    });

    it('ignores playback controls', async () => {
      await expect(service.updatePlaybackControls(controls())).resolves.toBeUndefined();
      await expect(service.updatePlaybackState('playing')).resolves.toBeUndefined();
    });

    it('does nothing on exit', () => {
      expect(() => service.exitApp()).not.toThrow();
    });

    it('forwards document events to listeners', async () => {
      const listener = vi.fn();
      service.addEventListener('volumeupbutton', listener);
      await flush();
      document.dispatchEvent(new Event('volumeupbutton'));
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('hosted by a Mopidy server', () => {
    it('reads the WebSocket URL and version from the document', async () => {
      document.body.setAttribute('data-web-socket-url', 'ws://host:6680/mopidy/ws');
      document.body.setAttribute('data-version', '2.0.0');
      const service = TestBed.inject(PlatformService);
      expect(service.isHosted()).toBe(true);
      expect(service.webSocketUrl()).toBe('ws://host:6680/mopidy/ws');
      await expect(service.appVersion()).resolves.toBe('2.0.0');
    });

    it('uses the default WebSocket when the URL is empty', () => {
      document.body.setAttribute('data-web-socket-url', '');
      const service = TestBed.inject(PlatformService);
      expect(service.isHosted()).toBe(true);
      expect(service.webSocketUrl()).toBeNull();
    });
  });

  describe('in a Cordova WebView', () => {
    let service: PlatformService;
    let musicControls: Record<string, ReturnType<typeof vi.fn>>;
    let onAction: ((action: string) => void) | null;
    let logging: LoggingService;

    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      onAction = null;
      musicControls = {
        create: vi.fn((options: unknown, resolve: () => void) => resolve()),
        destroy: vi.fn((resolve: () => void) => resolve()),
        updateIsPlaying: vi.fn(),
        updateDismissable: vi.fn(),
        subscribe: vi.fn((callback: (action: string) => void) => (onAction = callback)),
        listen: vi.fn(),
      };
      window.cordova = {
        InAppBrowser: { open: vi.fn() },
        plugins: { zeroconf: { watch: vi.fn(), unwatch: vi.fn(), close: vi.fn() } },
      };
      window.MusicControls = musicControls;
      window.AppVersion = { version: '2.0.0-app' };
      window.plugins = { socialsharing: { shareWithOptions: vi.fn() } };
      (navigator as any).app = { exitApp: vi.fn() };
      (navigator as any).splashscreen = { show: vi.fn(), hide: vi.fn() };
      logging = TestBed.inject(LoggingService);
      vi.spyOn(logging, 'warn');
      service = TestBed.inject(PlatformService);
    });

    afterEach(() => {
      delete window.cordova;
      delete window.MusicControls;
      delete window.AppVersion;
      delete window.plugins;
      delete (navigator as any).app;
      delete (navigator as any).splashscreen;
    });

    async function deviceReady(): Promise<void> {
      document.dispatchEvent(new Event('deviceready'));
      await flush();
    }

    it('is a WebView', () => {
      expect(service.isWebView()).toBe(true);
      expect(service.canShare()).toBe(true);
      expect(service.isHosted()).toBe(false);
    });

    it('becomes ready on the deviceready event', async () => {
      let ready = false;
      service.ready().then(() => (ready = true));
      await flush();
      expect(ready).toBe(false);
      await deviceReady();
      expect(ready).toBe(true);
    });

    it('reports the app version once ready', async () => {
      const version = service.appVersion();
      await deviceReady();
      await expect(version).resolves.toBe('2.0.0-app');
    });

    it('opens external links with the InAppBrowser plugin', () => {
      service.openExternal('https://example.com/');
      expect(window.cordova.InAppBrowser.open).toHaveBeenCalledWith('https://example.com/', '_system');
    });

    it('exits the app', () => {
      service.exitApp();
      expect(navigator.app!.exitApp).toHaveBeenCalled();
    });

    it('provides the splash screen and Zeroconf plugins', async () => {
      const splashscreen = service.splashscreen();
      const zeroconf = service.zeroconf();
      await deviceReady();
      expect(await splashscreen).toBe(navigator.splashscreen);
      expect(await zeroconf).toBe(window.cordova.plugins.zeroconf);
    });

    it('rejects when the Zeroconf plugin is missing', async () => {
      delete window.cordova.plugins;
      const zeroconf = service.zeroconf();
      await deviceReady();
      await expect(zeroconf).rejects.toThrow('Zeroconf plugin not installed');
    });

    it('shares content with the social sharing plugin', async () => {
      window.plugins.socialsharing.shareWithOptions.mockImplementation(
        (options: unknown, success: (result: unknown) => void) => success('shared'),
      );
      const result = service.share('Subject', 'Message');
      await deviceReady();
      await expect(result).resolves.toBe('shared');
      expect(window.plugins.socialsharing.shareWithOptions).toHaveBeenCalledWith(
        { subject: 'Subject', message: 'Message' },
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('rejects when sharing fails', async () => {
      window.plugins.socialsharing.shareWithOptions.mockImplementation(
        (options: unknown, success: unknown, failure: (error: unknown) => void) => failure('nope'),
      );
      const result = service.share('Subject', 'Message');
      await deviceReady();
      await expect(result).rejects.toBe('nope');
    });

    it('initializes the music controls once ready', async () => {
      expect(musicControls.subscribe).not.toHaveBeenCalled();
      await deviceReady();
      expect(musicControls.subscribe).toHaveBeenCalledTimes(1);
      expect(musicControls.listen).toHaveBeenCalledTimes(1);
    });

    it('warns when the music controls plugin is missing', async () => {
      delete window.MusicControls;
      await deviceReady();
      expect(logging.warn).toHaveBeenCalledWith('Music controls plugin not installed');
      await expect(service.updatePlaybackControls(controls())).resolves.toBeUndefined();
      await expect(service.updatePlaybackState('playing')).resolves.toBeUndefined();
    });

    it('creates a media notification for the current track', async () => {
      await deviceReady();
      await service.updatePlaybackControls(controls());
      expect(musicControls.create).toHaveBeenCalledWith(
        {
          track: 'Song',
          artist: 'A B',
          cover: 'http://img/cover.jpg',
          dismissable: false,
          isPlaying: true,
          hasPrev: false,
          hasNext: true,
          hasClose: false,
        },
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('describes the track in the notification subtitle', async () => {
      await deviceReady();
      const subtitle = async (overrides: Partial<PlaybackControls>) => {
        await service.updatePlaybackControls(controls(overrides));
        return musicControls.create.mock.lastCall![0];
      };
      expect(await subtitle({ streamTitle: 'Live Stream' })).toMatchObject({ artist: 'Live Stream' });
      expect(await subtitle({ track: track('x', { name: undefined, album: { name: 'Album' } }) })).toMatchObject({
        track: 'x',
        artist: 'Album',
      });
      expect(await subtitle({ track: track('x', { genre: 'Jazz' }) })).toMatchObject({ artist: 'Jazz' });
      expect(await subtitle({ track: track('x') })).toMatchObject({ artist: '' });
      expect(await subtitle({ image: null, state: 'paused' })).toMatchObject({
        cover: 'assets/icon.png',
        isPlaying: false,
      });
    });

    it('destroys the media notification without a track', async () => {
      await deviceReady();
      await service.updatePlaybackControls(controls({ track: null }));
      expect(musicControls.destroy).toHaveBeenCalledTimes(1);
      expect(musicControls.create).not.toHaveBeenCalled();
    });

    it('rejects when the plugin reports an error', async () => {
      await deviceReady();
      musicControls.create.mockImplementation((options: unknown, resolve: unknown, reject: (e: unknown) => void) =>
        reject('plugin error'),
      );
      await expect(service.updatePlaybackControls(controls())).rejects.toBe('plugin error');
    });

    it('updates the playing state', async () => {
      await deviceReady();
      await service.updatePlaybackState('playing');
      expect(musicControls.updateIsPlaying).toHaveBeenCalledWith(true);
      await service.updatePlaybackState('paused');
      expect(musicControls.updateIsPlaying).toHaveBeenCalledWith(false);
    });

    it('dispatches media notification actions to the playback controls', async () => {
      await deviceReady();
      const current = controls();
      await service.updatePlaybackControls(current);
      const action = (message: string) => onAction!(JSON.stringify({ message }));
      action('music-controls-next');
      expect(current.next).toHaveBeenCalledTimes(1);
      action('music-controls-previous');
      expect(current.previous).toHaveBeenCalledTimes(1);
      action('music-controls-pause');
      expect(current.pause).toHaveBeenCalledTimes(1);
      action('music-controls-play');
      expect(current.play).toHaveBeenCalledTimes(1);
      action('music-controls-destroy');
      expect(navigator.app!.exitApp).toHaveBeenCalledTimes(1);
      action('music-controls-toggle-play-pause');
    });

    it('ignores actions before playback controls are set', async () => {
      await deviceReady();
      expect(() => onAction!(JSON.stringify({ message: 'music-controls-next' }))).not.toThrow();
    });

    it('makes the notification dismissable while the app is paused', async () => {
      await deviceReady();
      document.dispatchEvent(new Event('pause'));
      expect(musicControls.updateDismissable).toHaveBeenCalledWith(true);
      await service.updatePlaybackControls(controls());
      expect(musicControls.create.mock.lastCall![0]).toMatchObject({ dismissable: true });
      document.dispatchEvent(new Event('resume'));
      expect(musicControls.updateDismissable).toHaveBeenCalledWith(false);
      await service.updatePlaybackControls(controls());
      expect(musicControls.create.mock.lastCall![0]).toMatchObject({ dismissable: false });
    });

    it('registers document event listeners once ready', async () => {
      const listener = vi.fn();
      service.addEventListener('volumedownbutton', listener);
      document.dispatchEvent(new Event('volumedownbutton'));
      expect(listener).not.toHaveBeenCalled();
      await deviceReady();
      document.dispatchEvent(new Event('volumedownbutton'));
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
