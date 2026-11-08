/* eslint-disable @typescript-eslint/no-explicit-any -- Mopidy's API is dynamic */
import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flush } from '../../testing/dom';
import { createMopidyApi } from '../../testing/mopidy';
import { ConnectionService, TimeoutError } from './connection.service';
import { LoadingService } from './loading.service';
import { LoggingService, reportedErrors } from './logging.service';
import { MopidyFactory } from './mopidy.service';

describe('ConnectionService', () => {
  let service: ConnectionService;
  let factory: { create: ReturnType<typeof vi.fn> };
  let alerts: { create: ReturnType<typeof vi.fn> };
  let alertOptions: any[];
  let dismissRole: string;
  let loading: LoadingService;
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    alertOptions = [];
    dismissRole = 'cancel';
    alerts = {
      create: vi.fn((options: unknown) => {
        alertOptions.push(options);
        return Promise.resolve({
          present: () => Promise.resolve(),
          onDidDismiss: () => Promise.resolve({ role: dismissRole }),
        });
      }),
    };
    factory = { create: vi.fn(() => Promise.resolve(createMopidyApi())) };
    TestBed.configureTestingModule({
      providers: [
        { provide: MopidyFactory, useValue: factory },
        { provide: AlertController, useValue: alerts },
      ],
    });
    service = TestBed.inject(ConnectionService);
    loading = TestBed.inject(LoadingService);
    logging = TestBed.inject(LoggingService);
    vi.spyOn(loading, 'show');
    vi.spyOn(loading, 'hide');
    vi.spyOn(logging, 'info');
    vi.spyOn(logging, 'warn');
    vi.spyOn(logging, 'error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** The notification callback registered with the client. */
  function notifier(mopidy: any): (name: string, data?: unknown) => void {
    const call = mopidy.on.mock.calls.find(([name]: [string]) => name === 'event');
    return call[1];
  }

  describe('get', () => {
    it('connects once and caches the connection', async () => {
      const mopidy = await service.get();
      expect(factory.create).toHaveBeenCalledTimes(1);
      expect(factory.create).toHaveBeenCalledWith({ backoffDelayMax: 2000, backoffDelayMin: 500 }, null);
      expect(await service.get()).toBe(mopidy);
      expect(factory.create).toHaveBeenCalledTimes(1);
    });

    it('subscribes to state and event notifications', async () => {
      const mopidy = await service.get();
      const names = mopidy.on.mock.calls.map(([name]: [string]) => name);
      expect(names).toEqual(['state', 'event']);
    });

    it('shows the loading indicator while connecting', async () => {
      let resolve!: (value: unknown) => void;
      factory.create.mockReturnValue(new Promise((r) => (resolve = r)));
      const promise = service.get();
      expect(loading.show).toHaveBeenCalledTimes(1);
      expect(loading.hide).not.toHaveBeenCalled();
      resolve(createMopidyApi());
      await promise;
      expect(loading.hide).toHaveBeenCalledTimes(1);
    });

    it('passes the connection timeout to the factory', async () => {
      service.connectionTimeout = 3000;
      await service.get();
      expect(factory.create).toHaveBeenCalledWith(expect.anything(), 3000);
    });
  });

  describe('on', () => {
    it('delivers matching events only', async () => {
      const mopidy = await service.get();
      const seeked: unknown[] = [];
      const paused: unknown[] = [];
      service.on('event:seeked').subscribe((data) => seeked.push(data));
      service.on('event:trackPlaybackPaused').subscribe((data) => paused.push(data));
      const notify = notifier(mopidy);
      notify('event:seeked', { time_position: 100 });
      notify('event:trackPlaybackPaused', { time_position: 200 });
      notify('event:seeked', { time_position: 300 });
      expect(seeked).toEqual([{ time_position: 100 }, { time_position: 300 }]);
      expect(paused).toEqual([{ time_position: 200 }]);
    });

    it('logs connection state changes', async () => {
      const mopidy = await service.get();
      const states: unknown[] = [];
      service.on('state:online').subscribe(() => states.push('online'));
      service.on('state:offline').subscribe(() => states.push('offline'));
      const notify = notifier(mopidy);
      notify('state:offline');
      notify('state:online');
      expect(states).toEqual(['offline', 'online']);
      expect(logging.warn).toHaveBeenCalledWith('Mopidy connection offline');
      expect(logging.info).toHaveBeenCalledWith('Mopidy connection online');
    });
  });

  describe('call', () => {
    it('runs the request with the connected client', async () => {
      const result = await service.call((mopidy) => {
        expect(typeof mopidy.playback.play).toBe('function');
        return 'ok';
      });
      expect(result).toBe('ok');
    });

    it('resolves promises returned by the request', async () => {
      await expect(service.call(() => Promise.resolve(42))).resolves.toBe(42);
    });

    it('shows the loading indicator while the request runs', async () => {
      await service.get();
      vi.mocked(loading.show).mockClear();
      vi.mocked(loading.hide).mockClear();
      let resolve!: (value: string) => void;
      const promise = service.call(() => new Promise<string>((r) => (resolve = r)));
      await flush();
      expect(loading.show).toHaveBeenCalledTimes(1);
      expect(loading.hide).not.toHaveBeenCalled();
      resolve('done');
      await promise;
      expect(loading.hide).toHaveBeenCalledTimes(1);
    });

    it('asks the user about failed requests and rethrows when ignored', async () => {
      const error = Object.assign(new Error('Something broke'), { name: 'ServerError', data: { message: 'details' } });
      dismissRole = 'cancel';
      await expect(service.call(() => Promise.reject(error))).rejects.toBe(error);
      expect(alerts.create).toHaveBeenCalledTimes(1);
      expect(alertOptions[0]).toMatchObject({
        header: 'Server error',
        subHeader: 'Something broke',
        message: 'details',
        backdropDismiss: false,
      });
      expect(alertOptions[0].buttons.map((button: { text: string }) => button.text)).toEqual(['Ignore', 'Retry']);
      expect(logging.error).toHaveBeenCalledWith('ServerError: Something broke', error);
      expect(reportedErrors.has(error)).toBe(true);
    });

    it('logs errors without a message', async () => {
      await expect(service.call(() => Promise.reject({ name: 'Weird' }))).rejects.toEqual({ name: 'Weird' });
      expect(logging.error).toHaveBeenCalledWith('Weird', { name: 'Weird' });
      expect(alertOptions[0].header).toBe('Weird');
      await expect(service.call(() => Promise.reject(undefined))).rejects.toBeUndefined();
      expect(logging.error).toHaveBeenCalledWith('Error', undefined);
      expect(alertOptions[1].header).toBe('Error');
    });

    it('retries failed requests on request', async () => {
      dismissRole = 'confirm';
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('first'))
        .mockResolvedValueOnce('second');
      await expect(service.call(fn)).resolves.toBe('second');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(alerts.create).toHaveBeenCalledTimes(1);
      expect(factory.create).toHaveBeenCalledTimes(1);
    });

    it('reconnects on every second retry', async () => {
      dismissRole = 'confirm';
      const first = await service.get();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('first'))
        .mockRejectedValueOnce(new Error('second'))
        .mockResolvedValueOnce('third');
      await expect(service.call(fn)).resolves.toBe('third');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(first.close).toHaveBeenCalledTimes(1);
      expect(first.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(factory.create).toHaveBeenCalledTimes(2);
    });

    it('times out long-running requests', async () => {
      vi.useFakeTimers();
      try {
        await service.get();
        service.requestTimeout = 1000;
        dismissRole = 'cancel';
        const promise = service.call(() => new Promise(() => undefined));
        promise.catch(() => undefined);
        await vi.advanceTimersByTimeAsync(1000);
        await expect(promise).rejects.toBeInstanceOf(TimeoutError);
        expect(alertOptions[0].header).toBe('Timeout error');
        expect(loading.hide).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not time out quick requests', async () => {
      vi.useFakeTimers();
      try {
        await service.get();
        service.requestTimeout = 1000;
        const promise = service.call(() => Promise.resolve('quick'));
        await vi.advanceTimersByTimeAsync(0);
        await expect(promise).resolves.toBe('quick');
        vi.advanceTimersByTime(2000);
        expect(alerts.create).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('reports connection failures', async () => {
      const error = Object.assign(new Error(), { name: 'ConnectionError' });
      factory.create.mockRejectedValueOnce(error);
      dismissRole = 'cancel';
      await expect(service.call(() => 'never')).rejects.toBe(error);
      expect(alertOptions[0].header).toBe('Connection error');
      expect(loading.hide).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('closes the client and forgets the connection', async () => {
      const mopidy = await service.get();
      service.close();
      await flush();
      expect(mopidy.close).toHaveBeenCalledTimes(1);
      expect(mopidy.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(await service.get()).not.toBe(mopidy);
      expect(factory.create).toHaveBeenCalledTimes(2);
    });

    it('does nothing when not connected', () => {
      expect(() => service.close()).not.toThrow();
    });

    it('ignores failed connections', async () => {
      factory.create.mockRejectedValueOnce(new Error('nope'));
      await service.get().catch(() => undefined);
      expect(() => service.close()).not.toThrow();
      await flush();
    });
  });

  describe('reset', () => {
    it('reconnects to a new WebSocket URL', async () => {
      const first = await service.get();
      const second = await service.reset('ws://other:6680/mopidy/ws/');
      await flush();
      expect(first.close).toHaveBeenCalled();
      expect(second).not.toBe(first);
      expect(factory.create).toHaveBeenLastCalledWith(
        { backoffDelayMax: 2000, backoffDelayMin: 500, webSocketUrl: 'ws://other:6680/mopidy/ws/' },
        null,
      );
      expect(service.getSettings().webSocketUrl).toBe('ws://other:6680/mopidy/ws/');
    });

    it('keeps the URL when none is given', async () => {
      await service.reset('ws://other:6680/mopidy/ws/');
      await service.reset();
      expect(service.getSettings().webSocketUrl).toBe('ws://other:6680/mopidy/ws/');
      expect(factory.create).toHaveBeenCalledTimes(2);
    });

    it('uses an existing client when given', async () => {
      const mopidy = createMopidyApi();
      await expect(service.reset('ws://given:6680/mopidy/ws/', mopidy)).resolves.toBe(mopidy);
      expect(factory.create).not.toHaveBeenCalled();
      expect(mopidy.on.mock.calls.map(([name]: [string]) => name)).toEqual(['state', 'event']);
      expect(await service.get()).toBe(mopidy);
    });

    it('notifies observers when replacing a connection', async () => {
      const online = vi.fn();
      service.on('state:online').subscribe(online);
      await service.get();
      await service.reset('ws://other:6680/mopidy/ws/');
      expect(online).toHaveBeenCalledTimes(1);
    });

    it('notifies observers when replacing a connection with an existing client', async () => {
      const online = vi.fn();
      service.on('state:online').subscribe(online);
      await service.get();
      await service.reset('ws://given:6680/mopidy/ws/', createMopidyApi());
      expect(online).toHaveBeenCalledTimes(1);
    });

    it('does not notify observers on the first connection', async () => {
      const online = vi.fn();
      service.on('state:online').subscribe(online);
      await service.reset('ws://first:6680/mopidy/ws/');
      expect(online).not.toHaveBeenCalled();
    });

    it('reports failures and retries on request', async () => {
      const error = Object.assign(new Error(), { name: 'ConnectionError' });
      factory.create.mockRejectedValueOnce(error);
      dismissRole = 'confirm';
      const mopidy = await service.reset('ws://flaky:6680/mopidy/ws/');
      expect(mopidy).toBeDefined();
      expect(factory.create).toHaveBeenCalledTimes(2);
      expect(alerts.create).toHaveBeenCalledTimes(1);
    });

    it('rethrows failures when ignored', async () => {
      const error = Object.assign(new Error(), { name: 'ConnectionError' });
      factory.create.mockRejectedValueOnce(error);
      dismissRole = 'cancel';
      await expect(service.reset('ws://down:6680/mopidy/ws/')).rejects.toBe(error);
    });

    it('returns a copy of the settings', () => {
      const settings = service.getSettings();
      settings.webSocketUrl = 'ws://modified/';
      expect(service.getSettings().webSocketUrl).toBeUndefined();
    });
  });
});
