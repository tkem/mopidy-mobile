import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { image, track } from '../../testing/mopidy';
import { Model } from '../models';
import { ArchiveCoverart, CoverartService, LastfmCoverart, MopidyCoverart } from './coverart.service';
import { LoggingService } from './logging.service';

describe('CoverartService', () => {
  let service: CoverartService;
  let logging: LoggingService;
  let mopidy: { getImages: ReturnType<typeof vi.fn> };
  let lastfm: { getImages: ReturnType<typeof vi.fn> };
  let archive: { getImages: ReturnType<typeof vi.fn> };

  const a = track('local:track:a');
  const b = track('local:track:b');
  const c = track('local:track:c');

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mopidy = { getImages: vi.fn().mockResolvedValue({}) };
    lastfm = { getImages: vi.fn().mockResolvedValue({}) };
    archive = { getImages: vi.fn().mockResolvedValue({}) };
    TestBed.configureTestingModule({
      providers: [
        { provide: MopidyCoverart, useValue: mopidy },
        { provide: LastfmCoverart, useValue: lastfm },
        { provide: ArchiveCoverart, useValue: archive },
      ],
    });
    service = TestBed.inject(CoverartService);
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses no providers by default', async () => {
    await expect(service.getImages([a])).resolves.toEqual({});
    expect(mopidy.getImages).not.toHaveBeenCalled();
    expect(lastfm.getImages).not.toHaveBeenCalled();
    expect(archive.getImages).not.toHaveBeenCalled();
  });

  it('queries the selected providers', async () => {
    service.use(['lastfm', 'mopidy']);
    await service.getImages([a]);
    expect(lastfm.getImages).toHaveBeenCalledWith([a]);
    expect(mopidy.getImages).toHaveBeenCalledWith([a]);
    expect(archive.getImages).not.toHaveBeenCalled();
  });

  it('reports unknown providers', () => {
    service.use(['mopidy', 'bogus']);
    expect(logging.error).toHaveBeenCalledWith('Invalid coverart service bogus');
  });

  it('selects the smallest image satisfying the requested size', async () => {
    service.use(['mopidy']);
    mopidy.getImages.mockResolvedValue({
      [a.uri]: [image('large', 300), image('small', 32), image('medium', 64)],
    });
    await expect(service.getImage(a, { width: 64, height: 64 })).resolves.toEqual(image('medium', 64));
    await expect(service.getImage(a, { width: 65, height: 65 })).resolves.toEqual(image('large', 300));
    await expect(service.getImage(a, { width: 10, height: 10 })).resolves.toEqual(image('small', 32));
    await expect(service.getImage(a)).resolves.toEqual(image('small', 32));
  });

  it('falls back to the largest image', async () => {
    service.use(['mopidy']);
    mopidy.getImages.mockResolvedValue({ [a.uri]: [image('small', 32), image('medium', 64)] });
    await expect(service.getImage(a, { width: 500, height: 500 })).resolves.toEqual(image('medium', 64));
  });

  it('prefers images of unknown size over too small ones', async () => {
    service.use(['mopidy']);
    mopidy.getImages.mockResolvedValue({ [a.uri]: [image('unknown'), image('small', 32)] });
    await expect(service.getImage(a, { width: 64, height: 64 })).resolves.toEqual(image('unknown'));
    await expect(service.getImage(a, { width: 16, height: 16 })).resolves.toEqual(image('small', 32));
  });

  it('merges images from all providers', async () => {
    service.use(['mopidy', 'lastfm']);
    mopidy.getImages.mockResolvedValue({ [a.uri]: [image('m', 500)] });
    lastfm.getImages.mockResolvedValue({ [a.uri]: [image('l', 126)], [b.uri]: [image('lb', 64)] });
    await expect(service.getImages([a, b], { width: 100, height: 100 })).resolves.toEqual({
      [a.uri]: image('l', 126),
      [b.uri]: image('lb', 64),
    });
  });

  it('returns null for items without images', async () => {
    service.use(['mopidy']);
    mopidy.getImages.mockResolvedValue({ [a.uri]: [] });
    await expect(service.getImage(a)).resolves.toBeNull();
    await expect(service.getImages([a])).resolves.toEqual({ [a.uri]: null });
  });

  it('caches results', async () => {
    service.use(['mopidy']);
    mopidy.getImages.mockResolvedValue({ [a.uri]: [image('a', 64)], [b.uri]: [] });
    await service.getImages([a, b]);
    await service.getImages([a, b]);
    expect(mopidy.getImages).toHaveBeenCalledTimes(1);
    service.clearCache();
    await service.getImages([a]);
    expect(mopidy.getImages).toHaveBeenCalledTimes(2);
  });

  it('only queries uncached items', async () => {
    service.use(['mopidy']);
    mopidy.getImages.mockResolvedValue({ [a.uri]: [image('a', 64)] });
    await service.getImages([a]);
    mopidy.getImages.mockResolvedValue({ [b.uri]: [image('b', 64)] });
    await expect(service.getImages([a, b])).resolves.toEqual({ [a.uri]: image('a', 64), [b.uri]: image('b', 64) });
    expect(mopidy.getImages).toHaveBeenLastCalledWith([b]);
  });

  it('evicts the least recently used entries', async () => {
    service.use(['mopidy']);
    service.maxCache = 2;
    mopidy.getImages.mockImplementation((models: Model[]) =>
      Promise.resolve(Object.fromEntries(models.map((model) => [model.uri, [image(model.uri, 64)]]))),
    );
    await service.getImages([a]);
    await service.getImages([b]);
    await service.getImages([a]); // a is now most recently used
    await service.getImages([c]); // evicts b
    mopidy.getImages.mockClear();
    await service.getImages([a, b, c]);
    expect(mopidy.getImages).toHaveBeenCalledTimes(1);
    expect(mopidy.getImages).toHaveBeenCalledWith([b]);
  });

  it('ignores failing providers', async () => {
    service.use(['mopidy', 'lastfm']);
    const error = new Error('offline');
    mopidy.getImages.mockRejectedValue(error);
    lastfm.getImages.mockResolvedValue({ [a.uri]: [image('l', 64)] });
    await expect(service.getImage(a)).resolves.toEqual(image('l', 64));
    expect(logging.error).toHaveBeenCalledWith('Error loading cover art', error);
  });
});

describe('MopidyCoverart', () => {
  let provider: MopidyCoverart;
  let connection: MockConnectionService;

  beforeEach(() => {
    connection = new MockConnectionService();
    TestBed.configureTestingModule({ providers: [provideMockConnection(connection)] });
    provider = TestBed.inject(MopidyCoverart);
  });

  it('gets images from the server', async () => {
    connection.mopidy.library.getImages.mockResolvedValue({
      'local:track:a': [{ __model__: 'Image', uri: 'http://img/a', width: 100, height: 100 }],
      'local:track:b': [],
      'local:track:c': null,
    });
    const result = await provider.getImages([track('local:track:a'), track('local:track:b'), track('local:track:c')]);
    expect(connection.mopidy.library.getImages).toHaveBeenCalledWith({
      uris: ['local:track:a', 'local:track:b', 'local:track:c'],
    });
    expect(result).toEqual({
      'local:track:a': [{ __model__: 'Image', uri: 'http://img/a', width: 100, height: 100 }],
      'local:track:b': [],
      'local:track:c': [],
    });
  });

  it('resolves absolute image paths against the server URL', async () => {
    connection.settings = { webSocketUrl: 'wss://mopidy.local:6680/mopidy/ws/' };
    connection.mopidy.library.getImages.mockResolvedValue({
      'local:track:a': [{ uri: '/local/images/a.jpg' }, { uri: 'http://other/b.jpg' }],
    });
    const result = await provider.getImages([track('local:track:a')]);
    expect(result['local:track:a'].map((img) => img.uri)).toEqual([
      'https://mopidy.local:6680/local/images/a.jpg',
      'http://other/b.jpg',
    ]);
  });

  it('keeps absolute paths without a server URL', async () => {
    connection.settings = { webSocketUrl: '' };
    connection.mopidy.library.getImages.mockResolvedValue({ 'local:track:a': [{ uri: '/a.jpg' }] });
    const result = await provider.getImages([track('local:track:a')]);
    expect(result['local:track:a']).toEqual([{ uri: '/a.jpg' }]);
  });

  it('skips stream URIs', async () => {
    await expect(provider.getImages([track('http://stream/x'), track('file:///a.mp3'), track('rtsp://x')])).resolves.toEqual(
      {},
    );
    expect(connection.mopidy.library.getImages).not.toHaveBeenCalled();
    connection.mopidy.library.getImages.mockResolvedValue({ 'spotify:track:1': [] });
    await provider.getImages([track('https://stream/y'), track('spotify:track:1')]);
    expect(connection.mopidy.library.getImages).toHaveBeenCalledWith({ uris: ['spotify:track:1'] });
  });
});

describe('LastfmCoverart', () => {
  let provider: LastfmCoverart;
  let fetchMock: ReturnType<typeof vi.fn>;
  let responses: Record<string, unknown>;

  function lastfmImages(sizes: [string, string][]) {
    return sizes.map(([size, text]) => ({ size, '#text': text }));
  }

  beforeEach(() => {
    responses = {};
    fetchMock = vi.fn((url: string) => {
      const method = new URL(url).searchParams.get('method') || '';
      const data = responses[method];
      return Promise.resolve(
        data === undefined
          ? { ok: false, status: 404, statusText: 'Not Found', json: () => Promise.resolve({}) }
          : { ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(data) },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    provider = TestBed.inject(LastfmCoverart);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function params(index = 0): URLSearchParams {
    return new URL(fetchMock.mock.calls[index][0]).searchParams;
  }

  it('requests album info by MusicBrainz ID', async () => {
    responses['album.getInfo'] = { album: { image: lastfmImages([['small', 'http://img/s'], ['mega', 'http://img/m']]) } };
    const album: Model = { __model__: 'Album', uri: 'local:album:1', name: 'Album', musicbrainz_id: 'mbid-1' };
    await expect(provider.getImages([album])).resolves.toEqual({
      'local:album:1': [
        { uri: 'http://img/s', width: 34, height: 34 },
        { uri: 'http://img/m', width: undefined, height: undefined },
      ],
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/ws\.audioscrobbler\.com\/2\.0\/\?/);
    expect(params().get('method')).toBe('album.getInfo');
    expect(params().get('mbid')).toBe('mbid-1');
    expect(params().get('format')).toBe('json');
    expect(params().get('api_key')).toBeTruthy();
  });

  it('requests album info by name and artist', async () => {
    responses['album.getInfo'] = { album: { image: [] } };
    const album: Model = { __model__: 'Album', uri: 'local:album:1', name: 'Album', artists: [{ name: 'Artist' }] };
    await provider.getImages([album]);
    expect(params().get('album')).toBe('Album');
    expect(params().get('artist')).toBe('Artist');
  });

  it('requests artist info', async () => {
    responses['artist.getInfo'] = { artist: { image: lastfmImages([['large', 'http://img/l']]) } };
    const artist: Model = { __model__: 'Artist', uri: 'local:artist:1', name: 'Artist' };
    await expect(provider.getImages([artist])).resolves.toEqual({
      'local:artist:1': [{ uri: 'http://img/l', width: 126, height: 126 }],
    });
    expect(params().get('method')).toBe('artist.getInfo');
    expect(params().get('artist')).toBe('Artist');
  });

  it('requests the album of a track, falling back to track info', async () => {
    responses['album.getInfo'] = { album: { image: lastfmImages([['medium', 'http://img/album']]) } };
    responses['track.getInfo'] = { track: { album: { image: lastfmImages([['medium', 'http://img/track']]) } } };
    const withAlbum = track('local:track:1', { album: { name: 'Album', musicbrainz_id: 'mbid-a' } });
    const withAlbumArtist = track('local:track:2', { album: { name: 'Album', artists: [{ name: 'AA' }] } });
    const withTrackArtist = track('local:track:3', { album: { name: 'Album' }, artists: [{ name: 'TA' }] });
    const withMbid = track('local:track:4', { musicbrainz_id: 'mbid-t' });
    const withName = track('local:track:5', { name: 'Song', artists: [{ name: 'TA' }] });
    const result = await provider.getImages([withAlbum, withAlbumArtist, withTrackArtist, withMbid, withName]);
    expect(Object.keys(result).sort()).toEqual(['local:track:1', 'local:track:2', 'local:track:3', 'local:track:4', 'local:track:5']);
    expect(result['local:track:1'][0].uri).toBe('http://img/album');
    expect(result['local:track:4'][0].uri).toBe('http://img/track');
    const all = fetchMock.mock.calls.map((call) => {
      const p = new URL(call[0] as string).searchParams;
      return ['method', 'mbid', 'album', 'artist', 'track'].map((name) => p.get(name) ?? undefined);
    });
    expect(all).toEqual([
      ['album.getInfo', 'mbid-a', undefined, undefined, undefined],
      ['album.getInfo', undefined, 'Album', 'AA', undefined],
      ['album.getInfo', undefined, 'Album', 'TA', undefined],
      ['track.getInfo', 'mbid-t', undefined, undefined, undefined],
      ['track.getInfo', undefined, undefined, 'TA', 'Song'],
    ]);
  });

  it('skips models without enough information', async () => {
    const result = await provider.getImages([
      { __model__: 'Album', uri: 'local:album:1', name: 'No artist' },
      { __model__: 'Artist', uri: 'local:artist:1' },
      { __model__: 'Ref', uri: 'local:directory:1', name: 'Dir' },
      track('local:track:1', { name: undefined }),
    ]);
    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shares requests between models with the same parameters', async () => {
    responses['album.getInfo'] = { album: { image: lastfmImages([['medium', 'http://img/album']]) } };
    const t1 = track('local:track:1', { album: { name: 'Album', musicbrainz_id: 'mbid-a' } });
    const t2 = track('local:track:2', { album: { name: 'Album', musicbrainz_id: 'mbid-a' } });
    const result = await provider.getImages([t1, t2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result['local:track:1']).toEqual(result['local:track:2']);
  });

  it('ignores empty image URLs', async () => {
    responses['artist.getInfo'] = { artist: { image: lastfmImages([['small', ''], ['medium', 'http://img/m']]) } };
    const result = await provider.getImages([{ __model__: 'Artist', uri: 'local:artist:1', name: 'A' }]);
    expect(result['local:artist:1']).toEqual([{ uri: 'http://img/m', width: 64, height: 64 }]);
  });

  it('returns no images for failed requests', async () => {
    const result = await provider.getImages([{ __model__: 'Artist', uri: 'local:artist:1', name: 'A' }]);
    expect(result).toEqual({ 'local:artist:1': [] });
  });

  it('returns no images for unexpected responses', async () => {
    responses['artist.getInfo'] = { error: 6, message: 'The artist you supplied could not be found' };
    const result = await provider.getImages([{ __model__: 'Artist', uri: 'local:artist:1', name: 'A' }]);
    expect(result).toEqual({ 'local:artist:1': [] });
  });
});

describe('ArchiveCoverart', () => {
  let provider: ArchiveCoverart;
  let loaded: string[];

  class FakeImage {
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: ((error: unknown) => void) | null = null;
    onabort: ((error: unknown) => void) | null = null;

    set src(value: string) {
      loaded.push(value);
      queueMicrotask(() => {
        if (value.includes('missing')) {
          this.onerror?.(new Event('error'));
        } else {
          this.width = 1200;
          this.height = 1200;
          this.onload?.();
        }
      });
    }
  }

  beforeEach(() => {
    loaded = [];
    vi.stubGlobal('Image', FakeImage);
    provider = TestBed.inject(ArchiveCoverart);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides front cover images for albums with a MusicBrainz ID', async () => {
    const album: Model = { __model__: 'Album', uri: 'local:album:1', musicbrainz_id: 'mbid-1' };
    await expect(provider.getImages([album])).resolves.toEqual({
      'local:album:1': [
        { uri: 'https://coverartarchive.org/release/mbid-1/front', width: 1200, height: 1200 },
        { uri: 'https://coverartarchive.org/release/mbid-1/front-250', width: 250, height: 250 },
        { uri: 'https://coverartarchive.org/release/mbid-1/front-500', width: 500, height: 500 },
      ],
    });
    expect(loaded).toEqual(['https://coverartarchive.org/release/mbid-1/front']);
  });

  it('uses the album of tracks and shares requests', async () => {
    const t1 = track('local:track:1', { album: { musicbrainz_id: 'mbid-1' } });
    const t2 = track('local:track:2', { album: { musicbrainz_id: 'mbid-1' } });
    const result = await provider.getImages([t1, t2]);
    expect(loaded).toHaveLength(1);
    expect(result['local:track:1']).toHaveLength(3);
    expect(result['local:track:2']).toEqual(result['local:track:1']);
  });

  it('skips models without a release ID', async () => {
    const result = await provider.getImages([
      { __model__: 'Artist', uri: 'local:artist:1', musicbrainz_id: 'mbid-artist' },
      { __model__: 'Album', uri: 'local:album:1', name: 'No ID' },
      track('local:track:1', { musicbrainz_id: 'mbid-track' }),
    ]);
    expect(result).toEqual({});
    expect(loaded).toEqual([]);
  });

  it('returns no images when loading fails', async () => {
    const album: Model = { __model__: 'Album', uri: 'local:album:1', musicbrainz_id: 'missing' };
    await expect(provider.getImages([album])).resolves.toEqual({ 'local:album:1': [] });
  });
});
