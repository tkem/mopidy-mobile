import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NavController, RefresherCustomEvent } from '@ionic/angular/standalone';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { flush } from '../../testing/dom';
import { image, ref, track } from '../../testing/mopidy';
import { fakeRoute, mockNavController, refresherEvent } from '../../testing/router';
import { Model } from '../models';
import { ActionsService } from '../services/actions.service';
import { DetailsCallbacks, DetailsService } from '../services/details.service';
import { LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { BrowsePage } from './browse.page';
import { LookupPage } from './lookup.page';
import { QueryPage } from './query.page';
import { SearchPage } from './search.page';

/** A mock `DetailsService`, letting tests invoke the callbacks. */
class MockDetailsService {
  readonly load = vi.fn();

  get calls(): { items: Model[]; callbacks: DetailsCallbacks; signal: AbortSignal }[] {
    return this.load.mock.calls.map(([items, callbacks, signal]) => ({ items, callbacks, signal }));
  }

  get last() {
    return this.calls[this.calls.length - 1];
  }
}

function configure(connection: MockConnectionService, details: MockDetailsService, route: ActivatedRoute, nav = mockNavController()) {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  TestBed.configureTestingModule({
    providers: [
      provideMockConnection(connection),
      { provide: DetailsService, useValue: details },
      { provide: ActivatedRoute, useValue: route },
      { provide: NavController, useValue: nav },
      { provide: MenuService, useValue: { track: vi.fn(), tracks: vi.fn() } },
      { provide: ActionsService, useValue: { default: vi.fn() } },
    ],
  });
  return nav;
}

describe('BrowsePage', () => {
  let connection: MockConnectionService;
  let details: MockDetailsService;
  let nav: ReturnType<typeof mockNavController>;

  const directory = ref('local:directory:albums', 'directory', { name: 'Albums' });
  const a = ref('local:track:a', 'track');
  const b = ref('local:track:b', 'track');

  beforeEach(() => {
    connection = new MockConnectionService();
    details = new MockDetailsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create(params = {}, query = {}): BrowsePage {
    nav = configure(connection, details, fakeRoute(params, query));
    return TestBed.runInInjectionContext(() => new BrowsePage());
  }

  it('browses the library root', async () => {
    connection.mopidy.library.browse.mockResolvedValue([directory, a]);
    const page = create();
    page.ngOnInit();
    await flush();
    expect(page.ref()).toEqual({ uri: null, name: null, type: 'directory' });
    expect(connection.mopidy.library.browse).toHaveBeenCalledWith({ uri: null });
    expect(page.items()).toEqual([directory, a]);
    expect(page.tracks()).toEqual([a]);
  });

  it('browses a directory given by the route', async () => {
    const page = create({ uri: 'local:directory:albums' }, { name: 'Albums', type: 'directory' });
    page.ngOnInit();
    await flush();
    expect(page.ref()).toEqual({ uri: 'local:directory:albums', name: 'Albums', type: 'directory' });
    expect(connection.mopidy.library.browse).toHaveBeenCalledWith({ uri: 'local:directory:albums' });
  });

  it('loads details for tracks and merges them into the items', async () => {
    connection.mopidy.library.browse.mockResolvedValue([directory, a, b]);
    const page = create();
    page.ngOnInit();
    await flush();
    expect(details.load).toHaveBeenCalledTimes(1);
    expect(details.last.items).toEqual([a, b]);
    details.last.callbacks.tracks!({ 'local:track:a': track('local:track:a', { name: 'Full A' }) });
    expect(page.items()[1]).toEqual(track('local:track:a', { name: 'Full A' }));
    expect(page.items()[0]).toEqual(directory);
    details.last.callbacks.images({ 'local:track:a': image('a', 64) });
    details.last.callbacks.images({ 'local:track:b': null });
    expect(page.images()).toEqual({ 'local:track:a': image('a', 64), 'local:track:b': null });
  });

  it('aborts loading details when reloading or destroyed', async () => {
    connection.mopidy.library.browse.mockResolvedValue([a]);
    const page = create();
    page.ngOnInit();
    await flush();
    const first = details.last.signal;
    await page.reload();
    expect(first.aborted).toBe(true);
    const second = details.last.signal;
    expect(second.aborted).toBe(false);
    TestBed.resetTestingModule();
    expect(second.aborted).toBe(true);
  });

  it('maps item types to icons', () => {
    const page = create();
    expect(page.icon('album')).toBe('disc');
    expect(page.icon('artist')).toBe('person');
    expect(page.icon('playlist')).toBe('list');
    expect(page.icon('directory')).toBe('folder');
    expect(page.icon(undefined)).toBe('folder');
    expect(page.icon('unknown')).toBe('folder');
  });

  it('navigates into directories', () => {
    const page = create();
    page.browse(directory);
    expect(nav.navigateForward).toHaveBeenCalledWith(['/library/browse', 'local:directory:albums'], {
      queryParams: { name: 'Albums', type: 'directory' },
    });
  });

  it('opens the query form for the current directory', () => {
    const page = create({ uri: 'local:directory:albums' }, { name: 'Albums' });
    page.ngOnInit();
    page.query();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/library/query'], {
      queryParams: { uri: 'local:directory:albums', name: 'Albums' },
    });
  });

  it('searches within the current directory', () => {
    const page = create({ uri: 'local:directory:albums' });
    page.ngOnInit();
    page.search();
    expect(nav.navigateForward).not.toHaveBeenCalled();
    page.q = 'beatles';
    page.search();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/library/search'], {
      queryParams: { any: ['beatles'], uris: ['local:directory:albums'] },
    });
  });

  it('searches the whole library at the root', () => {
    const page = create();
    page.ngOnInit();
    page.q = 'beatles';
    page.search();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/library/search'], {
      queryParams: { any: ['beatles'], uris: null },
    });
  });

  it('refreshes the library', async () => {
    connection.mopidy.library.browse.mockResolvedValue([a]);
    const page = create({ uri: 'local:directory:albums' });
    page.ngOnInit();
    const event = refresherEvent();
    await page.refresh(event as unknown as RefresherCustomEvent);
    expect(connection.mopidy.library.refresh).toHaveBeenCalledWith({ uri: 'local:directory:albums' });
    expect(connection.mopidy.library.browse).toHaveBeenCalledTimes(2);
    expect(event.target.complete).toHaveBeenCalled();
    expect(page.items()).toEqual([a]);
  });

  it('reloads when the connection comes online', async () => {
    const page = create();
    connection.mopidy.library.browse.mockResolvedValue([a]);
    connection.emit('state:online');
    await flush();
    expect(page.items()).toEqual([a]);
  });

  it('logs errors', async () => {
    const error = new Error('offline');
    connection.fail(error);
    const page = create();
    const logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    page.ngOnInit();
    await flush();
    await page.reload();
    const event = refresherEvent();
    await page.refresh(event as unknown as RefresherCustomEvent);
    expect(logging.warn).toHaveBeenCalledWith('Error browsing library', error);
    expect(logging.warn).toHaveBeenCalledWith('Error refreshing library', error);
    expect(logging.warn).toHaveBeenCalledTimes(3);
    expect(event.target.complete).toHaveBeenCalled();
  });
});

describe('SearchPage', () => {
  let connection: MockConnectionService;
  let details: MockDetailsService;
  let nav: ReturnType<typeof mockNavController>;

  const artist: Model = { __model__: 'Artist', uri: 'local:artist:1', name: 'Zed' };
  const album: Model = { __model__: 'Album', uri: 'local:album:1', name: 'Album' };
  const t1 = track('local:track:1', { name: 'B side' });
  const t2 = track('local:track:2', { name: 'A side' });

  beforeEach(() => {
    connection = new MockConnectionService();
    details = new MockDetailsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create(query: Record<string, string | string[]> = {}): SearchPage {
    nav = configure(connection, details, fakeRoute({}, query));
    return TestBed.runInInjectionContext(() => new SearchPage());
  }

  it('searches with the query parameters of the route', async () => {
    connection.mopidy.library.search.mockResolvedValue([{ artists: [artist], albums: [album], tracks: [t1, t2] }]);
    const page = create({ any: ['foo', 'bar'], artist: 'baz', uris: 'local:directory:1', exact: 'true', bogus: 'x' });
    page.ngOnInit();
    await flush();
    expect(connection.mopidy.library.search).toHaveBeenCalledWith({
      query: { any: ['foo', 'bar'], artist: ['baz'] },
      uris: ['local:directory:1'],
      exact: true,
    });
    expect(page.artists()).toEqual([artist]);
    expect(page.albums()).toEqual([album]);
    expect(page.tracks()).toEqual([t1, t2]);
  });

  it('searches all backends by default', async () => {
    const page = create({ any: 'foo' });
    page.ngOnInit();
    await flush();
    expect(connection.mopidy.library.search).toHaveBeenCalledWith({ query: { any: ['foo'] }, uris: null, exact: false });
  });

  it('merges and sorts results of multiple backends', async () => {
    connection.mopidy.library.search.mockResolvedValue([
      { tracks: [t1], artists: [artist] },
      { tracks: [t2], albums: [album] },
    ]);
    const page = create({ any: 'foo' });
    page.ngOnInit();
    await flush();
    expect(page.tracks()).toEqual([t2, t1]);
    expect(page.artists()).toEqual([artist]);
    expect(page.albums()).toEqual([album]);
  });

  it('handles empty results', async () => {
    connection.mopidy.library.search.mockResolvedValue([{}]);
    const page = create({ any: 'foo' });
    page.ngOnInit();
    await flush();
    expect(page.tracks()).toEqual([]);
    expect(page.artists()).toEqual([]);
    expect(page.albums()).toEqual([]);
  });

  it('loads thumbnails for all results not yet loaded', async () => {
    connection.mopidy.library.search.mockResolvedValue([{ artists: [artist], albums: [album], tracks: [t1] }]);
    const page = create({ any: 'foo' });
    page.ngOnInit();
    await flush();
    expect(details.last.items).toEqual([artist, album, t1]);
    expect(details.last.callbacks.tracks).toBeUndefined();
    details.last.callbacks.images({ 'local:track:1': image('t1', 64) });
    expect(page.images()).toEqual({ 'local:track:1': image('t1', 64) });
    await page.reload();
    expect(details.last.items).toEqual([artist, album]);
  });

  it('opens albums and artists', () => {
    const page = create();
    page.lookup(album);
    expect(nav.navigateForward).toHaveBeenCalledWith(['/library/lookup', 'local:album:1'], {
      queryParams: { name: 'Album' },
    });
  });

  it('refreshes a single backend or the whole library', async () => {
    const page = create({ any: 'foo', uris: 'local:directory:1' });
    page.ngOnInit();
    await page.refresh(refresherEvent() as unknown as RefresherCustomEvent);
    expect(connection.mopidy.library.refresh).toHaveBeenCalledWith({ uri: 'local:directory:1' });
    TestBed.resetTestingModule();
    const all = create({ any: 'foo', uris: ['local:directory:1', 'spotify:directory'] });
    all.ngOnInit();
    const event = refresherEvent();
    await all.refresh(event as unknown as RefresherCustomEvent);
    expect(connection.mopidy.library.refresh).toHaveBeenLastCalledWith({ uri: null });
    expect(connection.mopidy.library.search).toHaveBeenCalledTimes(4);
    expect(event.target.complete).toHaveBeenCalled();
  });

  it('reloads when the connection comes online and logs errors', async () => {
    const page = create({ any: 'foo' });
    const logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    connection.mopidy.library.search.mockResolvedValue([{ tracks: [t1] }]);
    connection.emit('state:online');
    await flush();
    expect(page.tracks()).toEqual([t1]);
    const error = new Error('offline');
    connection.fail(error);
    page.ngOnInit();
    await flush();
    expect(logging.warn).toHaveBeenCalledWith('Error searching library', error);
  });
});

describe('LookupPage', () => {
  let connection: MockConnectionService;
  let details: MockDetailsService;

  const t1 = track('local:track:1');
  const t2 = track('local:track:2');

  beforeEach(() => {
    connection = new MockConnectionService();
    details = new MockDetailsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create(): LookupPage {
    configure(connection, details, fakeRoute({ uri: 'local:album:1' }, { name: 'Album' }));
    return TestBed.runInInjectionContext(() => new LookupPage());
  }

  it('looks up the tracks of the item', async () => {
    connection.mopidy.library.lookup.mockResolvedValue({ 'local:album:1': [t1, t2] });
    const page = create();
    page.ngOnInit();
    await flush();
    expect(page.uri).toBe('local:album:1');
    expect(page.name).toBe('Album');
    expect(connection.mopidy.library.lookup).toHaveBeenCalledWith({ uris: ['local:album:1'] });
    expect(page.tracks()).toEqual([t1, t2]);
    expect(details.last.items).toEqual([t1, t2]);
    details.last.callbacks.images({ 'local:track:1': image('1', 64) });
    expect(page.images()).toEqual({ 'local:track:1': image('1', 64) });
  });

  it('handles missing results', async () => {
    connection.mopidy.library.lookup.mockResolvedValue({});
    const page = create();
    page.ngOnInit();
    await flush();
    expect(page.tracks()).toEqual([]);
  });

  it('refreshes the item', async () => {
    connection.mopidy.library.lookup.mockResolvedValue({ 'local:album:1': [t1] });
    const page = create();
    page.ngOnInit();
    await flush();
    details.last.callbacks.images({ 'local:track:1': image('1', 64) });
    connection.mopidy.library.lookup.mockResolvedValue({ 'local:album:1': [t1, t2] });
    const event = refresherEvent();
    await page.refresh(event as unknown as RefresherCustomEvent);
    expect(connection.mopidy.library.refresh).toHaveBeenCalledWith({ uri: 'local:album:1' });
    expect(page.tracks()).toEqual([t1, t2]);
    expect(details.last.items).toEqual([t2]);
    expect(event.target.complete).toHaveBeenCalled();
  });

  it('logs errors', async () => {
    const error = new Error('offline');
    connection.fail(error);
    const page = create();
    const logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    page.ngOnInit();
    await flush();
    await page.refresh(refresherEvent() as unknown as RefresherCustomEvent);
    expect(logging.warn).toHaveBeenCalledWith('Error looking up local:album:1', error);
    expect(logging.warn).toHaveBeenCalledWith('Error refreshing local:album:1', error);
  });
});

describe('QueryPage', () => {
  let nav: ReturnType<typeof mockNavController>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create(query: Record<string, string> = {}): QueryPage {
    nav = mockNavController();
    TestBed.configureTestingModule({
      providers: [
        { provide: NavController, useValue: nav },
        { provide: ActivatedRoute, useValue: fakeRoute({}, query) },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new QueryPage());
    page.ngOnInit();
    return page;
  }

  it('starts with a single empty term', () => {
    const page = create();
    expect(page.terms).toEqual([{ key: 'any', value: '' }]);
    expect(page.valid()).toBe(false);
    expect(page.uri).toBeNull();
    expect(page.name).toBeNull();
  });

  it('reads the directory from the route', () => {
    const page = create({ uri: 'local:directory:1', name: 'Local' });
    expect(page.uri).toBe('local:directory:1');
    expect(page.name).toBe('Local');
  });

  it('keeps an empty term at the end while typing', () => {
    const page = create();
    page.terms[0].value = 'foo';
    page.update();
    expect(page.terms).toHaveLength(2);
    page.update();
    expect(page.terms).toHaveLength(2);
    expect(page.valid()).toBe(true);
    page.terms[1].value = 'bar';
    page.update();
    expect(page.terms).toHaveLength(3);
  });

  it('requires all but the last term to be filled', () => {
    const page = create();
    page.terms = [
      { key: 'any', value: 'foo' },
      { key: 'artist', value: '' },
      { key: 'any', value: '' },
    ];
    expect(page.valid()).toBe(false);
    page.remove(1);
    expect(page.terms).toHaveLength(2);
    expect(page.valid()).toBe(true);
  });

  it('does not submit invalid queries', () => {
    const page = create();
    page.submit();
    expect(nav.navigateForward).not.toHaveBeenCalled();
  });

  it('navigates to the search results', () => {
    const page = create({ uri: 'local:directory:1' });
    page.terms = [
      { key: 'artist', value: 'Beatles' },
      { key: 'any', value: 'love' },
      { key: 'any', value: 'me' },
      { key: 'any', value: '' },
    ];
    page.exact = true;
    page.submit();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/library/search'], {
      queryParams: { artist: ['Beatles'], any: ['love', 'me'], uris: ['local:directory:1'], exact: 'true' },
    });
  });

  it('omits the URIs when searching the whole library', () => {
    const page = create();
    page.terms = [{ key: 'any', value: 'foo' }];
    page.submit();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/library/search'], {
      queryParams: { any: ['foo'], exact: 'false' },
    });
  });

  it('lists the searchable fields', () => {
    const page = create();
    expect(page.fields.map(([key]) => key)).toEqual([
      'any',
      'album',
      'albumartist',
      'artist',
      'comment',
      'composer',
      'date',
      'genre',
      'performer',
      'track_name',
    ]);
  });
});
