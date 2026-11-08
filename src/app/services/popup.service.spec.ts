import { TestBed } from '@angular/core/testing';
import { AlertController, ModalController } from '@ionic/angular/standalone';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../../testing/connection';
import { ref, track } from '../../testing/mopidy';
import { AddStreamComponent } from '../shared/add-stream.component';
import { SelectPlaylistComponent } from '../shared/select-playlist.component';
import { TrackInfoComponent } from '../shared/track-info.component';
import { ActionsService } from './actions.service';
import { PopupService } from './popup.service';

describe('PopupService', () => {
  let service: PopupService;
  let connection: MockConnectionService;
  let actions: { addToPlaylist: ReturnType<typeof vi.fn> };
  let alerts: { create: ReturnType<typeof vi.fn> };
  let modals: { create: ReturnType<typeof vi.fn> };
  let alertResult: { role?: string; data?: unknown };
  let modalResult: { role?: string; data?: unknown };
  let presented: string[];

  beforeEach(() => {
    presented = [];
    alertResult = { role: 'cancel' };
    modalResult = { role: 'cancel' };
    alerts = {
      create: vi.fn().mockImplementation(() =>
        Promise.resolve({
          present: () => {
            presented.push('alert');
            return Promise.resolve();
          },
          onDidDismiss: () => Promise.resolve(alertResult),
        }),
      ),
    };
    modals = {
      create: vi.fn().mockImplementation(() =>
        Promise.resolve({
          present: () => {
            presented.push('modal');
            return Promise.resolve();
          },
          onDidDismiss: () => Promise.resolve(modalResult),
        }),
      ),
    };
    actions = { addToPlaylist: vi.fn().mockResolvedValue(undefined) };
    connection = new MockConnectionService();
    TestBed.configureTestingModule({
      providers: [
        provideMockConnection(connection),
        { provide: ActionsService, useValue: actions },
        { provide: AlertController, useValue: alerts },
        { provide: ModalController, useValue: modals },
      ],
    });
    service = TestBed.inject(PopupService);
  });

  it('shows translated alerts', async () => {
    await service.alert('Nothing playing');
    expect(alerts.create).toHaveBeenCalledWith({ header: 'Nothing playing', buttons: ['OK'] });
    expect(presented).toEqual(['alert']);
  });

  it('asks for confirmation', async () => {
    await expect(service.confirm('Clear tracklist')).resolves.toBe(false);
    const options = alerts.create.mock.calls[0][0];
    expect(options.header).toBe('Clear tracklist');
    expect(options.buttons).toEqual([
      { text: 'Cancel', role: 'cancel' },
      { text: 'OK', role: 'confirm' },
    ]);
    alertResult = { role: 'confirm' };
    await expect(service.confirm('Clear tracklist')).resolves.toBe(true);
    alertResult = { role: 'backdrop' };
    await expect(service.confirm('Clear tracklist')).resolves.toBe(false);
  });

  it('prompts for text input', async () => {
    alertResult = { role: 'confirm', data: { values: { value: 'My Playlist' } } };
    await expect(service.prompt('Name', 'placeholder')).resolves.toBe('My Playlist');
    const options = alerts.create.mock.calls[0][0];
    expect(options.inputs).toEqual([{ name: 'value', type: 'text', placeholder: 'placeholder' }]);
    alertResult = { role: 'confirm', data: { values: { value: '' } } };
    await expect(service.prompt('Name')).resolves.toBeNull();
    alertResult = { role: 'cancel', data: { values: { value: 'ignored' } } };
    await expect(service.prompt('Name')).resolves.toBeNull();
  });

  it('shows track information', async () => {
    const t = track('local:track:1');
    await service.trackInfo(t);
    expect(connection.mopidy.library.lookup).not.toHaveBeenCalled();
    expect(modals.create).toHaveBeenCalledWith({ component: TrackInfoComponent, componentProps: { track: t } });
    expect(presented).toEqual(['modal']);
  });

  it('looks up full track details on request', async () => {
    const t = track('local:track:1', { name: 'Short' });
    connection.mopidy.library.lookup.mockResolvedValue({
      'local:track:1': [track('local:track:1', { name: 'Full', album: { name: 'Album' } })],
    });
    await service.trackInfo(t, true);
    expect(connection.mopidy.library.lookup).toHaveBeenCalledWith({ uris: ['local:track:1'] });
    expect(modals.create.mock.calls[0][0].componentProps.track).toEqual(
      track('local:track:1', { name: 'Full', album: { name: 'Album' } }),
    );
  });

  it('shows the original track when the lookup finds nothing', async () => {
    const t = track('local:track:1');
    connection.mopidy.library.lookup.mockResolvedValue({ 'local:track:1': [] });
    await service.trackInfo(t, true);
    expect(modals.create.mock.calls[0][0].componentProps.track).toEqual(t);
  });

  it('adds items to a selected playlist', async () => {
    const t = track('local:track:1');
    const playlists = [ref('m3u:a', 'playlist'), ref('m3u:b', 'playlist')];
    connection.mopidy.playlists.asList.mockResolvedValue(playlists);
    modalResult = { role: 'confirm', data: 'm3u:b' };
    await service.addToPlaylist(t);
    expect(modals.create).toHaveBeenCalledWith({
      component: SelectPlaylistComponent,
      componentProps: { playlists },
    });
    expect(actions.addToPlaylist).toHaveBeenCalledWith('m3u:b', t);
  });

  it('does nothing when playlist selection is cancelled', async () => {
    modalResult = { role: 'cancel', data: 'm3u:b' };
    await service.addToPlaylist(track('local:track:1'));
    expect(actions.addToPlaylist).not.toHaveBeenCalled();
  });

  it('asks for a new stream', async () => {
    modalResult = { role: 'confirm', data: { name: 'Radio', uri: 'http://radio/' } };
    await expect(service.addStream(true)).resolves.toEqual({ name: 'Radio', uri: 'http://radio/' });
    expect(modals.create).toHaveBeenCalledWith({ component: AddStreamComponent, componentProps: { withName: true } });
    modalResult = { role: 'cancel' };
    await expect(service.addStream()).resolves.toBeNull();
    expect(modals.create).toHaveBeenLastCalledWith({ component: AddStreamComponent, componentProps: { withName: false } });
  });
});
