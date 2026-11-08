import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { flush } from '../../testing/dom';
import { createMopidyApi } from '../../testing/mopidy';
import { LoggingService } from './logging.service';
import { PlatformService, ZeroconfResult, ZeroconfService } from './platform.service';
import { Server, ServersService } from './servers.service';
import { SettingsService } from './settings.service';

function zeroconfService(name: string, ipv4: string[], port = 6680): ZeroconfService {
  return { name, port, ipv4Addresses: ipv4, ipv6Addresses: [] };
}

describe('ServersService', () => {
  let connection: MockConnectionService;
  let settings: SettingsService;
  let logging: LoggingService;
  let zeroconf: { watch: ReturnType<typeof vi.fn>; unwatch: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let platform: { zeroconf: ReturnType<typeof vi.fn> };
  let onResult: ((result: ZeroconfResult) => void) | null;
  let onError: ((error: unknown) => void) | undefined;

  const alpha: Server = { name: 'Alpha', url: 'ws://alpha:6680/mopidy/ws/' };
  const beta: Server = { name: 'Beta', url: 'ws://beta:6680/mopidy/ws/' };

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.clear();
    onResult = null;
    zeroconf = {
      watch: vi.fn((type: string, domain: string, success: typeof onResult, failure?: typeof onError) => {
        onResult = success;
        onError = failure;
      }),
      unwatch: vi.fn(),
      close: vi.fn(),
    };
    platform = { zeroconf: vi.fn(() => Promise.resolve(zeroconf)) };
    connection = new MockConnectionService();
    TestBed.configureTestingModule({
      providers: [provideMockConnection(connection), { provide: PlatformService, useValue: platform }],
    });
    settings = TestBed.inject(SettingsService);
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'error');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function create(): Promise<ServersService> {
    const service = TestBed.inject(ServersService);
    await flush();
    return service;
  }

  it('lists configured servers sorted by name', async () => {
    settings.extend({ servers: [beta, alpha] });
    const service = await create();
    expect(service.servers()).toEqual([
      { ...alpha, auto: false },
      { ...beta, auto: false },
    ]);
    expect(service.currentUrl()).toBeNull();
  });

  it('starts Zeroconf discovery for Mopidy servers', async () => {
    await create();
    expect(zeroconf.watch).toHaveBeenCalledWith('_mopidy-http._tcp.', 'local.', expect.any(Function), expect.any(Function));
  });

  it('adds and removes discovered servers', async () => {
    const service = await create();
    onResult!({ action: 'added', service: zeroconfService('Pi', ['192.168.1.10']) });
    expect(service.servers()).toEqual([]);
    onResult!({ action: 'resolved', service: zeroconfService('Pi', ['192.168.1.10']) });
    expect(service.servers()).toEqual([{ name: 'Pi', url: 'ws://192.168.1.10:6680/mopidy/ws/', auto: true }]);
    onResult!({ action: 'resolved', service: zeroconfService('Pi', ['192.168.1.10']) });
    expect(service.servers()).toHaveLength(1);
    onResult!({ action: 'removed', service: zeroconfService('Pi', ['192.168.1.10']) });
    expect(service.servers()).toEqual([]);
  });

  it('ignores services without IPv4 addresses', async () => {
    const service = await create();
    onResult!({ action: 'resolved', service: zeroconfService('V6', []) });
    expect(service.servers()).toEqual([]);
  });

  it('lists discovered servers after configured ones, hiding duplicates', async () => {
    settings.extend({ servers: [{ name: 'Mine', url: 'ws://192.168.1.10:6680/mopidy/ws/' }] });
    const service = await create();
    onResult!({ action: 'resolved', service: zeroconfService('Pi', ['192.168.1.10']) });
    onResult!({ action: 'resolved', service: zeroconfService('Other', ['192.168.1.11'], 6681) });
    expect(service.servers()).toEqual([
      { name: 'Mine', url: 'ws://192.168.1.10:6680/mopidy/ws/', auto: false },
      { name: 'Other', url: 'ws://192.168.1.11:6681/mopidy/ws/', auto: true },
    ]);
  });

  it('logs Zeroconf errors', async () => {
    await create();
    onError!('boom');
    expect(logging.error).toHaveBeenCalledWith('Zeroconf error:', 'boom');
  });

  it('logs when Zeroconf is not available', async () => {
    const error = new Error('no plugin');
    platform.zeroconf.mockRejectedValue(error);
    const service = await create();
    expect(logging.error).toHaveBeenCalledWith('Zeroconf not available', error);
    expect(service.servers()).toEqual([]);
  });

  it('adds configured servers persistently', async () => {
    const service = await create();
    service.add({ ...beta, auto: true });
    service.add(alpha);
    expect(service.servers()).toEqual([
      { ...alpha, auto: false },
      { ...beta, auto: false },
    ]);
    expect(settings.get().servers).toEqual([beta, alpha]);
  });

  it('removes configured servers persistently', async () => {
    settings.extend({ servers: [alpha, beta] });
    const service = await create();
    service.remove(alpha);
    expect(service.servers()).toEqual([{ ...beta, auto: false }]);
    expect(settings.get().servers).toEqual([beta]);
    service.remove({ name: 'Beta', url: 'ws://elsewhere/' });
    expect(service.servers()).toHaveLength(1);
  });

  it('connects to a server and remembers it', async () => {
    const service = await create();
    await service.connect({ ...alpha, auto: true });
    expect(service.currentUrl()).toBe(alpha.url);
    expect(connection.reset).toHaveBeenCalledWith(alpha.url, undefined);
    expect(settings.get().server).toEqual(alpha);
  });

  it('connects using an existing client', async () => {
    const service = await create();
    const mopidy = createMopidyApi();
    await service.connect(alpha, mopidy);
    expect(connection.reset).toHaveBeenCalledWith(alpha.url, mopidy);
  });

  it('restarts discovery on refresh', async () => {
    const service = await create();
    onResult!({ action: 'resolved', service: zeroconfService('Pi', ['192.168.1.10']) });
    expect(service.servers()).toHaveLength(1);
    vi.useFakeTimers();
    let done = false;
    const promise = service.refresh().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(service.servers()).toEqual([]);
    expect(zeroconf.close).toHaveBeenCalledTimes(1);
    expect(zeroconf.watch).toHaveBeenCalledTimes(2);
    onResult!({ action: 'resolved', service: zeroconfService('Pi', ['192.168.1.10']) });
    expect(service.servers()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(done).toBe(true);
  });

  it('handles refresh without Zeroconf', async () => {
    const service = await create();
    platform.zeroconf.mockRejectedValue(new Error('gone'));
    await expect(service.refresh()).resolves.toBeUndefined();
    expect(logging.error).toHaveBeenCalledWith('Zeroconf not available', expect.any(Error));
  });
});
