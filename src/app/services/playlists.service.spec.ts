import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { flush } from '../../testing/dom';
import { ref } from '../../testing/mopidy';
import { LoggingService } from './logging.service';
import { PlaylistsService } from './playlists.service';
import { PopupService } from './popup.service';

describe('PlaylistsService', () => {
  let service: PlaylistsService;
  let connection: MockConnectionService;
  let popup: { confirm: ReturnType<typeof vi.fn> };
  let logging: LoggingService;

  const playlists = [
    ref('m3u:zeta.m3u', 'playlist', { name: 'Zeta' }),
    ref('spotify:playlist:1', 'playlist', { name: 'Alpha' }),
    ref('m3u:beta.m3u', 'playlist', { name: 'Beta' }),
  ];

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    connection = new MockConnectionService();
    popup = { confirm: vi.fn().mockResolvedValue(false) };
    TestBed.configureTestingModule({
      providers: [provideMockConnection(connection), { provide: PopupService, useValue: popup }],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'warn');
    service = TestBed.inject(PlaylistsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads playlists once on start', async () => {
    connection.mopidy.playlists.asList.mockResolvedValue(playlists);
    service.start();
    service.start();
    await flush();
    expect(service.playlists()).toEqual(playlists);
    expect(connection.mopidy.playlists.asList).toHaveBeenCalledTimes(1);
  });

  it('logs errors when loading fails', async () => {
    const error = new Error('offline');
    connection.fail(error);
    service.start();
    await flush();
    expect(logging.warn).toHaveBeenCalledWith('Error loading playlists', error);
    await service.reload();
    expect(logging.warn).toHaveBeenCalledTimes(2);
  });

  it('keeps the server order by default', () => {
    service.playlists.set(playlists);
    expect(service.sorted()).toEqual(playlists);
  });

  it('sorts by name', () => {
    service.playlists.set(playlists);
    service.setOrder({ name: true });
    expect(service.sorted().map((p) => p.name)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  it('sorts by scheme, keeping the order within a scheme', () => {
    service.playlists.set(playlists);
    service.setOrder({ scheme: true });
    expect(service.sorted().map((p) => p.name)).toEqual(['Zeta', 'Beta', 'Alpha']);
    service.setOrder({ name: true });
    expect(service.order()).toEqual({ name: true, scheme: true });
    expect(service.sorted().map((p) => p.name)).toEqual(['Beta', 'Zeta', 'Alpha']);
    service.setOrder({ scheme: false });
    expect(service.sorted().map((p) => p.name)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  it('handles playlists without names', () => {
    service.playlists.set([ref('m3u:b', 'playlist', { name: undefined }), ref('m3u:a', 'playlist', { name: 'A' })]);
    service.setOrder({ name: true });
    expect(service.sorted().map((p) => p.uri)).toEqual(['m3u:b', 'm3u:a']);
  });

  it('reloads on playlist events and when coming online', async () => {
    connection.mopidy.playlists.asList.mockResolvedValue(playlists);
    for (const event of ['event:playlistsLoaded', 'event:playlistChanged', 'event:playlistDeleted', 'state:online']) {
      connection.emit(event, {});
    }
    await flush();
    expect(connection.mopidy.playlists.asList).toHaveBeenCalledTimes(4);
    expect(service.playlists()).toEqual(playlists);
  });

  it('refreshes playlists on the server, then reloads', async () => {
    connection.mopidy.playlists.asList.mockResolvedValue(playlists);
    await service.refresh();
    expect(connection.mopidy.playlists.refresh).toHaveBeenCalledWith({ uri_scheme: null });
    expect(service.playlists()).toEqual(playlists);
  });

  it('reloads even when refreshing fails', async () => {
    const error = new Error('refresh failed');
    connection.mopidy.playlists.refresh.mockRejectedValue(error);
    await expect(service.refresh()).rejects.toBe(error);
    expect(connection.mopidy.playlists.asList).toHaveBeenCalledTimes(1);
  });

  it('deletes playlists after confirmation', async () => {
    await service.confirmDelete(playlists[0]);
    expect(popup.confirm).toHaveBeenCalledWith('Delete playlist');
    expect(connection.mopidy.playlists.delete).not.toHaveBeenCalled();
    popup.confirm.mockResolvedValue(true);
    connection.mopidy.playlists.asList.mockResolvedValue(playlists.slice(1));
    await service.confirmDelete(playlists[0]);
    expect(connection.mopidy.playlists.delete).toHaveBeenCalledWith({ uri: 'm3u:zeta.m3u' });
    expect(service.playlists()).toEqual(playlists.slice(1));
  });
});
