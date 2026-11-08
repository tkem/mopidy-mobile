import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NavController, RefresherCustomEvent } from '@ionic/angular/standalone';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flush } from '../../testing/dom';
import { createMopidyApi } from '../../testing/mopidy';
import { fakeRoute, mockNavController, refresherEvent } from '../../testing/router';
import { LoggingService } from '../services/logging.service';
import { MopidyFactory } from '../services/mopidy.service';
import { PlatformService } from '../services/platform.service';
import { PopupService } from '../services/popup.service';
import { Server, ServersService } from '../services/servers.service';
import { ServersAddPage } from './servers-add.page';
import { ServersEditPage } from './servers-edit.page';
import { ServersPage } from './servers.page';

const alpha: Server = { name: 'Alpha', url: 'ws://alpha:6680/mopidy/ws/', auto: false };
const beta: Server = { name: 'Beta', url: 'ws://beta:6680/mopidy/ws/', auto: true };

describe('ServersAddPage', () => {
  let page: ServersAddPage;
  let nav: ReturnType<typeof mockNavController>;
  let servers: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    nav = mockNavController();
    servers = { add: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: NavController, useValue: nav },
        { provide: ServersService, useValue: servers },
      ],
    });
    page = TestBed.runInInjectionContext(() => new ServersAddPage());
  });

  it('builds the WebSocket URL from its parts', () => {
    page.host = 'mopidy.local';
    expect(page.webSocketUrl()).toBe('ws://mopidy.local:6680/mopidy/ws/');
    page.port = 8080;
    page.path = '/ws/';
    page.secure = true;
    expect(page.webSocketUrl()).toBe('wss://mopidy.local:8080/ws/');
  });

  it('adds the server and goes back', () => {
    page.name = 'Home';
    page.host = '192.168.1.2';
    page.add();
    expect(servers.add).toHaveBeenCalledWith({ name: 'Home', url: 'ws://192.168.1.2:6680/mopidy/ws/' });
    expect(nav.back).toHaveBeenCalled();
  });

  it('goes back on cancel', () => {
    page.cancel();
    expect(servers.add).not.toHaveBeenCalled();
    expect(nav.back).toHaveBeenCalled();
  });
});

describe('ServersEditPage', () => {
  let page: ServersEditPage;
  let nav: ReturnType<typeof mockNavController>;
  let servers: { servers: ReturnType<typeof signal<Server[]>>; remove: ReturnType<typeof vi.fn> };
  let popup: { confirm: ReturnType<typeof vi.fn> };
  let route: ActivatedRoute;

  beforeEach(() => {
    nav = mockNavController();
    servers = { servers: signal([alpha, beta]), remove: vi.fn() };
    popup = { confirm: vi.fn().mockResolvedValue(false) };
    route = fakeRoute();
    TestBed.configureTestingModule({
      providers: [
        { provide: NavController, useValue: nav },
        { provide: ServersService, useValue: servers },
        { provide: PopupService, useValue: popup },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    page = TestBed.runInInjectionContext(() => new ServersEditPage());
  });

  it('lists configured servers only', () => {
    expect(page.configured()).toEqual([alpha]);
  });

  it('removes servers after confirmation', async () => {
    await page.remove(alpha);
    expect(popup.confirm).toHaveBeenCalledWith('Remove server');
    expect(servers.remove).not.toHaveBeenCalled();
    popup.confirm.mockResolvedValue(true);
    await page.remove(alpha);
    expect(servers.remove).toHaveBeenCalledWith(alpha);
  });

  it('navigates to the add page and back', () => {
    page.add();
    expect(nav.navigateForward).toHaveBeenCalledWith(['../add'], { relativeTo: route });
    page.done();
    expect(nav.back).toHaveBeenCalled();
  });
});

describe('ServersPage', () => {
  let nav: ReturnType<typeof mockNavController>;
  let servers: {
    servers: ReturnType<typeof signal<Server[]>>;
    currentUrl: ReturnType<typeof signal<string | null>>;
    connect: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };
  let factory: { create: ReturnType<typeof vi.fn> };
  let splashscreen: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.clear();
    nav = mockNavController();
    servers = {
      servers: signal<Server[]>([]),
      currentUrl: signal<string | null>(null),
      connect: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(undefined),
    };
    factory = { create: vi.fn() };
    splashscreen = { show: vi.fn(), hide: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function create(parentPaths: string[] = []): ServersPage {
    TestBed.configureTestingModule({
      providers: [
        { provide: NavController, useValue: nav },
        { provide: ServersService, useValue: servers },
        { provide: MopidyFactory, useValue: factory },
        { provide: PlatformService, useValue: { splashscreen: vi.fn().mockResolvedValue(splashscreen) } },
        { provide: ActivatedRoute, useValue: fakeRoute({}, {}, parentPaths) },
      ],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    return TestBed.runInInjectionContext(() => new ServersPage());
  }

  it('detects whether it is shown within the settings', () => {
    expect(create().inSettings).toBe(false);
    TestBed.resetTestingModule();
    expect(create(['', 'settings', 'servers']).inSettings).toBe(true);
  });

  it('reconnects to the last server on startup', async () => {
    localStorage.setItem('mopidy-mobile', JSON.stringify({ server: alpha }));
    const mopidy = createMopidyApi();
    factory.create.mockResolvedValue(mopidy);
    const page = create();
    page.ngOnInit();
    await flush();
    expect(factory.create).toHaveBeenCalledWith({ webSocketUrl: alpha.url }, 3000);
    expect(servers.connect).toHaveBeenCalledWith(alpha, mopidy);
    expect(nav.navigateRoot).toHaveBeenCalledWith('/playback');
    expect(splashscreen.hide).not.toHaveBeenCalled();
  });

  it('shows the server list when reconnecting fails', async () => {
    vi.useFakeTimers();
    localStorage.setItem('mopidy-mobile', JSON.stringify({ server: alpha }));
    const error = new Error('refused');
    factory.create.mockRejectedValue(error);
    servers.servers.set([alpha]);
    const page = create();
    page.ngOnInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(logging.warn).toHaveBeenCalledWith('Error connecting to ' + alpha.url, error);
    expect(servers.connect).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    expect(splashscreen.hide).toHaveBeenCalledTimes(1);
  });

  it('waits longer for discovery when no servers are known', async () => {
    vi.useFakeTimers();
    const page = create();
    page.ngOnInit();
    await vi.advanceTimersByTimeAsync(250);
    expect(factory.create).not.toHaveBeenCalled();
    expect(splashscreen.hide).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(750);
    expect(splashscreen.hide).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect when already connected or within the settings', async () => {
    localStorage.setItem('mopidy-mobile', JSON.stringify({ server: alpha }));
    servers.currentUrl.set(alpha.url);
    create().ngOnInit();
    TestBed.resetTestingModule();
    servers.currentUrl.set(null);
    create(['settings']).ngOnInit();
    await flush();
    expect(factory.create).not.toHaveBeenCalled();
  });

  it('connects to a selected server and shows the playback view', async () => {
    const page = create();
    await page.connect(beta);
    expect(servers.connect).toHaveBeenCalledWith(beta, undefined);
    expect(nav.navigateRoot).toHaveBeenCalledTimes(1);
    expect(nav.navigateRoot).toHaveBeenCalledWith('/playback');
  });

  it('discards the navigation stack when switching servers from the settings', async () => {
    const page = create(['settings']);
    await page.connect(beta);
    expect(nav.navigateRoot.mock.calls).toEqual([
      ['/servers', { animated: false }],
      ['/playback'],
    ]);
  });

  it('navigates relative to the current route', () => {
    const page = create();
    page.navigate('edit');
    expect(nav.navigateForward).toHaveBeenCalledWith(['edit'], { relativeTo: TestBed.inject(ActivatedRoute) });
  });

  it('refreshes the server list', async () => {
    const page = create();
    const event = refresherEvent();
    page.refresh(event as unknown as RefresherCustomEvent);
    await flush();
    expect(servers.refresh).toHaveBeenCalled();
    expect(event.target.complete).toHaveBeenCalled();
  });

  it('lists configured servers only', () => {
    servers.servers.set([alpha, beta]);
    expect(create().configured()).toEqual([alpha]);
  });
});
