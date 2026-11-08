import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { flush } from '../../testing/dom';
import { image, ref, track } from '../../testing/mopidy';
import { Model } from '../models';
import { THUMBNAIL_SIZE } from '../shared/thumbnail.component';
import { CoverartService } from './coverart.service';
import { DetailsService } from './details.service';
import { LoggingService } from './logging.service';

describe('DetailsService', () => {
  let service: DetailsService;
  let connection: MockConnectionService;
  let coverart: { getImages: ReturnType<typeof vi.fn> };
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    connection = new MockConnectionService();
    coverart = {
      getImages: vi.fn((models: Model[]) =>
        Promise.resolve(Object.fromEntries(models.map((model) => [model.uri, image(model.uri, 64)]))),
      ),
    };
    TestBed.configureTestingModule({
      providers: [provideMockConnection(connection), { provide: CoverartService, useValue: coverart }],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'error');
    service = TestBed.inject(DetailsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads thumbnails for items', async () => {
    const items = [track('a'), track('b')];
    const images = vi.fn();
    service.load(items, { images }, new AbortController().signal);
    await flush();
    expect(connection.mopidy.library.lookup).not.toHaveBeenCalled();
    expect(coverart.getImages).toHaveBeenCalledWith(items, THUMBNAIL_SIZE);
    expect(images).toHaveBeenCalledWith({ a: image('a', 64), b: image('b', 64) });
  });

  it('looks up track details for library refs', async () => {
    const items = [ref('a'), track('b'), ref('c'), ref('d')];
    connection.mopidy.library.lookup.mockResolvedValue({
      a: [track('a', { name: 'Full A', album: { name: 'Album' } })],
      c: [track('c'), track('c2')],
      d: [],
    });
    const tracks = vi.fn();
    const images = vi.fn();
    service.load(items, { tracks, images }, new AbortController().signal);
    await flush();
    expect(connection.mopidy.library.lookup).toHaveBeenCalledWith({ uris: ['a', 'c', 'd'] });
    expect(tracks).toHaveBeenCalledWith({
      a: { ...ref('a'), ...track('a', { name: 'Full A', album: { name: 'Album' } }) },
    });
    const models = coverart.getImages.mock.calls[0][0] as Model[];
    expect(models.map((model) => model.uri)).toEqual(['a', 'b', 'c', 'd']);
    expect(models[0].__model__).toBe('Track');
    expect(models[2]).toEqual(ref('c'));
    expect(images).toHaveBeenCalledWith({ a: image('a', 64), b: image('b', 64), c: image('c', 64), d: image('d', 64) });
  });

  it('skips the lookup when there are no refs', async () => {
    const tracks = vi.fn();
    service.load([track('a')], { tracks, images: vi.fn() }, new AbortController().signal);
    await flush();
    expect(connection.mopidy.library.lookup).not.toHaveBeenCalled();
    expect(tracks).not.toHaveBeenCalled();
  });

  it('loads details page by page', async () => {
    const items = Array.from({ length: 5 }, (_, i) => ref(`r${i}`));
    connection.mopidy.library.lookup.mockImplementation(({ uris }: { uris: string[] }) =>
      Promise.resolve(Object.fromEntries(uris.map((uri) => [uri, [track(uri)]]))),
    );
    const tracks = vi.fn();
    const images = vi.fn();
    service.load(items, { tracks, images }, new AbortController().signal, 2);
    await flush();
    expect(connection.mopidy.library.lookup).toHaveBeenCalledTimes(3);
    expect(tracks).toHaveBeenCalledTimes(3);
    expect(images).toHaveBeenCalledTimes(3);
    expect(Object.keys(tracks.mock.calls[2][0])).toEqual(['r4']);
  });

  it('stops when aborted', async () => {
    const abort = new AbortController();
    const items = Array.from({ length: 4 }, (_, i) => ref(`r${i}`));
    connection.mopidy.library.lookup.mockImplementation(({ uris }: { uris: string[] }) => {
      if (uris[0] === 'r2') {
        abort.abort();
      }
      return Promise.resolve(Object.fromEntries(uris.map((uri) => [uri, [track(uri)]])));
    });
    const tracks = vi.fn();
    const images = vi.fn();
    service.load(items, { tracks, images }, abort.signal, 2);
    await flush();
    expect(connection.mopidy.library.lookup).toHaveBeenCalledTimes(2);
    expect(tracks).toHaveBeenCalledTimes(1);
    expect(images).toHaveBeenCalledTimes(1);
  });

  it('logs errors', async () => {
    const error = new Error('offline');
    connection.fail(error);
    service.load([ref('a')], { tracks: vi.fn(), images: vi.fn() }, new AbortController().signal);
    await flush();
    expect(logging.error).toHaveBeenCalledWith('Error loading details', error);
  });
});
