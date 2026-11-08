import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ItemReorderEventDetail, NavController, RefresherCustomEvent } from '@ionic/angular/standalone';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { flush } from '../../testing/dom';
import { image, ref, track } from '../../testing/mopidy';
import { fakeRoute, mockNavController, refresherEvent } from '../../testing/router';
import { Model } from '../models';
import { ActionsService } from '../services/actions.service';
import { DetailsService } from '../services/details.service';
import { LoggingService } from '../services/logging.service';
import { MenuItem, MenuService } from '../services/menu.service';
import { PlaylistOrder, PlaylistsService } from '../services/playlists.service';
import { PopupService } from '../services/popup.service';
import { PlaylistEditPage } from './playlist-edit.page';
import { PlaylistPage } from './playlist.page';
import { PlaylistsEditPage } from './playlists-edit.page';
import { showPlaylistsMenu } from './playlists-menu';
import { PlaylistsPage } from './playlists.page';

const playlist = ref('m3u:test.m3u', 'playlist', { name: 'Test' });
const items = [ref('local:track:1'), ref('local:track:2')];

function mockPlaylistsService() {
  return {
    playlists: signal([playlist]),
    sorted: signal([playlist]),
    order: signal<PlaylistOrder>({}),
    start: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    confirmDelete: vi.fn().mockResolvedValue(undefined),
    setOrder: vi.fn(),
  };
}

describe('showPlaylistsMenu', () => {
  it('shows checkbox items for the sort order', () => {
    const menu = { show: vi.fn() };
    const playlists = mockPlaylistsService();
    playlists.order.set({ name: true });
    const event = new Event('click');
    showPlaylistsMenu(menu as unknown as MenuService, playlists as unknown as PlaylistsService, event);
    expect(menu.show).toHaveBeenCalledWith(event, expect.any(Array));
    const items: MenuItem[] = menu.show.mock.calls[0][1];
    expect(items.map((item) => [item.text, item.checked])).toEqual([
      ['Sort by name', true],
      ['Sort by scheme', false],
    ]);
    items[0].toggle!(false);
    items[1].toggle!(true);
    expect(playlists.setOrder.mock.calls).toEqual([[{ name: false }], [{ scheme: true }]]);
  });
});

describe('PlaylistsPage', () => {
  let page: PlaylistsPage;
  let nav: ReturnType<typeof mockNavController>;
  let playlists: ReturnType<typeof mockPlaylistsService>;
  let menu: { show: ReturnType<typeof vi.fn> };
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    nav = mockNavController();
    playlists = mockPlaylistsService();
    menu = { show: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: NavController, useValue: nav },
        { provide: PlaylistsService, useValue: playlists },
        { provide: MenuService, useValue: menu },
      ],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    page = TestBed.runInInjectionContext(() => new PlaylistsPage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts loading playlists', () => {
    page.ngOnInit();
    expect(playlists.start).toHaveBeenCalled();
  });

  it('opens playlists', () => {
    page.open(playlist);
    expect(nav.navigateForward).toHaveBeenCalledWith(['/playlists', 'm3u:test.m3u'], { queryParams: { name: 'Test' } });
  });

  it('refreshes playlists, logging errors', async () => {
    const event = refresherEvent();
    page.refresh(event as unknown as RefresherCustomEvent);
    await flush();
    expect(playlists.refresh).toHaveBeenCalled();
    expect(event.target.complete).toHaveBeenCalled();
    const error = new Error('fail');
    playlists.refresh.mockRejectedValue(error);
    page.refresh(event as unknown as RefresherCustomEvent);
    await flush();
    expect(logging.warn).toHaveBeenCalledWith('Error refreshing playlists', error);
    expect(event.target.complete).toHaveBeenCalledTimes(2);
  });

  it('shows the sort menu', () => {
    const event = new Event('click');
    page.showMenu(event);
    expect(menu.show).toHaveBeenCalledWith(event, expect.any(Array));
  });
});

describe('PlaylistsEditPage', () => {
  let page: PlaylistsEditPage;
  let nav: ReturnType<typeof mockNavController>;
  let menu: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    nav = mockNavController();
    menu = { show: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: NavController, useValue: nav },
        { provide: PlaylistsService, useValue: mockPlaylistsService() },
        { provide: MenuService, useValue: menu },
      ],
    });
    page = TestBed.runInInjectionContext(() => new PlaylistsEditPage());
  });

  it('navigates to the create page and back', () => {
    page.create();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/playlists/create']);
    page.done();
    expect(nav.back).toHaveBeenCalled();
  });

  it('shows the sort menu', () => {
    page.showMenu(new Event('click'));
    expect(menu.show).toHaveBeenCalled();
  });
});

describe('PlaylistPage', () => {
  let connection: MockConnectionService;
  let details: { load: ReturnType<typeof vi.fn> };
  let nav: ReturnType<typeof mockNavController>;
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    connection = new MockConnectionService();
    details = { load: vi.fn() };
    nav = mockNavController();
    TestBed.configureTestingModule({
      providers: [
        provideMockConnection(connection),
        { provide: DetailsService, useValue: details },
        { provide: NavController, useValue: nav },
        { provide: ActivatedRoute, useValue: fakeRoute({ uri: 'm3u:test.m3u' }, { name: 'Test' }) },
        { provide: MenuService, useValue: { tracks: vi.fn(), playlistItem: vi.fn() } },
        { provide: ActionsService, useValue: { default: vi.fn() } },
      ],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create(): PlaylistPage {
    return TestBed.runInInjectionContext(() => new PlaylistPage());
  }

  it('loads the playlist items', async () => {
    connection.mopidy.playlists.getItems.mockResolvedValue(items);
    const page = create();
    page.ngOnInit();
    await flush();
    expect(page.uri).toBe('m3u:test.m3u');
    expect(page.name()).toBe('Test');
    expect(page.editable()).toBe(true);
    expect(connection.mopidy.playlists.getItems).toHaveBeenCalledWith({ uri: 'm3u:test.m3u' });
    expect(page.items()).toEqual(items);
    expect(details.load).toHaveBeenCalledWith(items, expect.anything(), expect.any(AbortSignal));
  });

  it('handles read-only and missing playlists', async () => {
    connection.mopidy.playlists.editable = false;
    connection.mopidy.playlists.getItems.mockResolvedValue(null);
    const page = create();
    page.ngOnInit();
    await flush();
    expect(page.editable()).toBe(false);
    expect(page.items()).toEqual([]);
  });

  it('merges track details and thumbnails', async () => {
    connection.mopidy.playlists.getItems.mockResolvedValue(items);
    const page = create();
    page.ngOnInit();
    await flush();
    const callbacks = details.load.mock.calls[0][1];
    callbacks.tracks({ 'local:track:2': track('local:track:2', { name: 'Full' }) });
    expect(page.items()).toEqual([items[0], track('local:track:2', { name: 'Full' })]);
    callbacks.images({ 'local:track:1': image('1', 64) });
    expect(page.images()).toEqual({ 'local:track:1': image('1', 64) });
  });

  it('opens the editor', () => {
    const page = create();
    page.ngOnInit();
    page.edit();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/playlists', 'm3u:test.m3u', 'edit'], {
      queryParams: { name: 'Test' },
    });
  });

  it('refreshes the playlist scheme', async () => {
    const page = create();
    page.ngOnInit();
    const event = refresherEvent();
    await page.refresh(event as unknown as RefresherCustomEvent);
    expect(connection.mopidy.playlists.refresh).toHaveBeenCalledWith({ uri_scheme: 'm3u' });
    expect(connection.mopidy.playlists.getItems).toHaveBeenCalledTimes(2);
    expect(event.target.complete).toHaveBeenCalled();
  });

  it('reloads when the playlist changes or the connection comes online', async () => {
    const page = create();
    page.ngOnInit();
    await flush();
    connection.mopidy.playlists.getItems.mockResolvedValue(items);
    connection.emit('event:playlistChanged', { playlist: { uri: 'm3u:other.m3u', name: 'Other' } });
    await flush();
    expect(page.items()).toEqual([]);
    connection.emit('event:playlistChanged', { playlist: { uri: 'm3u:test.m3u', name: 'Renamed' } });
    await flush();
    expect(page.name()).toBe('Renamed');
    expect(page.items()).toEqual(items);
    connection.mopidy.playlists.getItems.mockResolvedValue([items[0]]);
    connection.emit('state:online');
    await flush();
    expect(page.items()).toEqual([items[0]]);
  });

  it('logs errors', async () => {
    const error = new Error('offline');
    connection.fail(error);
    const page = create();
    page.ngOnInit();
    await flush();
    await page.reload();
    await page.refresh(refresherEvent() as unknown as RefresherCustomEvent);
    expect(logging.warn).toHaveBeenCalledWith('Error loading playlist m3u:test.m3u', error);
    expect(logging.warn).toHaveBeenCalledWith('Error refreshing playlist m3u:test.m3u', error);
    expect(logging.warn).toHaveBeenCalledTimes(3);
  });
});

describe('PlaylistEditPage', () => {
  let connection: MockConnectionService;
  let nav: ReturnType<typeof mockNavController>;
  let playlists: ReturnType<typeof mockPlaylistsService>;
  let popup: { addStream: ReturnType<typeof vi.fn> };
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    connection = new MockConnectionService();
    nav = mockNavController();
    playlists = mockPlaylistsService();
    popup = { addStream: vi.fn().mockResolvedValue(null) };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create(params = {}, query = {}): PlaylistEditPage {
    TestBed.configureTestingModule({
      providers: [
        provideMockConnection(connection),
        { provide: NavController, useValue: nav },
        { provide: PlaylistsService, useValue: playlists },
        { provide: PopupService, useValue: popup },
        { provide: MenuService, useValue: { tracks: vi.fn() } },
        { provide: ActivatedRoute, useValue: fakeRoute(params, query) },
      ],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    const page = TestBed.runInInjectionContext(() => new PlaylistEditPage());
    page.ngOnInit();
    return page;
  }

  it('starts empty when creating a playlist', async () => {
    const page = create();
    await flush();
    expect(page.uri).toBeNull();
    expect(page.name).toBe('');
    expect(page.items()).toEqual([]);
    expect(connection.mopidy.playlists.getItems).not.toHaveBeenCalled();
  });

  it('loads an existing playlist', async () => {
    connection.mopidy.playlists.getItems.mockResolvedValue(items);
    const page = create({ uri: 'm3u:test.m3u' }, { name: 'Test' });
    await flush();
    expect(page.name).toBe('Test');
    expect(page.items()).toEqual(items);
  });

  it('adds streams', async () => {
    const page = create();
    await page.addStream();
    expect(popup.addStream).toHaveBeenCalledWith(true);
    expect(page.items()).toEqual([]);
    popup.addStream.mockResolvedValue({ name: 'Radio', uri: 'http://radio/' });
    await page.addStream();
    expect(page.items()).toEqual([{ __model__: 'Track', name: 'Radio', uri: 'http://radio/' }]);
  });

  it('removes and reorders items', () => {
    const page = create();
    page.items.set([ref('a'), ref('b'), ref('c')]);
    const complete = vi.fn();
    page.reorder(new CustomEvent('ionItemReorder', { detail: { from: 0, to: 2, complete } as unknown as ItemReorderEventDetail }));
    expect(complete).toHaveBeenCalledWith(false);
    expect(page.items().map((item) => item.uri)).toEqual(['b', 'c', 'a']);
    page.remove(1);
    expect(page.items().map((item) => item.uri)).toEqual(['b', 'a']);
  });

  it('creates a new playlist on save', async () => {
    const page = create();
    page.name = 'New';
    page.items.set([ref('a', 'track', { name: 'A' })]);
    await page.saveAndClose();
    expect(connection.mopidy.playlists.create).toHaveBeenCalledWith({ name: 'New' });
    expect(connection.mopidy.playlists.save).toHaveBeenCalledWith({
      playlist: expect.objectContaining({ name: 'New', tracks: [{ __model__: 'Track', name: 'A', uri: 'a' }] }),
    });
    expect(page.uri).toBe('m3u:New.m3u');
    expect(playlists.reload).toHaveBeenCalled();
    expect(nav.back).toHaveBeenCalled();
  });

  it('updates an existing playlist on save', async () => {
    connection.mopidy.playlists.getItems.mockResolvedValue(items);
    connection.mopidy.playlists.lookup.mockResolvedValue({ __model__: 'Playlist', uri: 'm3u:test.m3u', name: 'Test', tracks: [] });
    const page = create({ uri: 'm3u:test.m3u' }, { name: 'Test' });
    await flush();
    page.name = '';
    await page.saveAndClose();
    expect(connection.mopidy.playlists.lookup).toHaveBeenCalledWith({ uri: 'm3u:test.m3u' });
    expect(connection.mopidy.playlists.create).not.toHaveBeenCalled();
    const saved = connection.mopidy.playlists.save.mock.calls[0][0].playlist;
    expect(saved.name).toBe('Test');
    expect(saved.tracks.map((t: Model) => t.uri)).toEqual(['local:track:1', 'local:track:2']);
    expect(page.name).toBe('Test');
  });

  it('cancels without saving', () => {
    const page = create();
    page.cancel();
    expect(connection.mopidy.playlists.save).not.toHaveBeenCalled();
    expect(nav.back).toHaveBeenCalled();
  });

  it('logs loading errors', async () => {
    const error = new Error('offline');
    connection.fail(error);
    create({ uri: 'm3u:test.m3u' });
    await flush();
    expect(logging.warn).toHaveBeenCalledWith('Error loading playlist m3u:test.m3u', error);
  });
});
