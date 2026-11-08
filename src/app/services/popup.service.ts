import { Injectable, inject } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular/standalone';

import { Model, Ref, Track } from '../models';
import { AddStreamComponent, Stream } from '../shared/add-stream.component';
import { SelectPlaylistComponent } from '../shared/select-playlist.component';
import { TrackInfoComponent } from '../shared/track-info.component';
import { ActionsService } from './actions.service';
import { ConnectionService } from './connection.service';
import { TranslateService } from './translate.service';

/** Dialogs, with translated messages and buttons. */
@Injectable({ providedIn: 'root' })
export class PopupService {
  private readonly actions = inject(ActionsService);
  private readonly alerts = inject(AlertController);
  private readonly connection = inject(ConnectionService);
  private readonly modals = inject(ModalController);
  private readonly translate = inject(TranslateService);

  async alert(message: string): Promise<void> {
    const alert = await this.alerts.create({
      header: this.translate.instant(message),
      buttons: [this.translate.instant('OK')],
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  async confirm(message: string): Promise<boolean> {
    const alert = await this.alerts.create({
      header: this.translate.instant(message),
      buttons: [
        { text: this.translate.instant('Cancel'), role: 'cancel' },
        { text: this.translate.instant('OK'), role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  async prompt(message: string, placeholder?: string): Promise<string | null> {
    const alert = await this.alerts.create({
      header: this.translate.instant(message),
      inputs: [{ name: 'value', type: 'text', placeholder }],
      buttons: [
        { text: this.translate.instant('Cancel'), role: 'cancel' },
        { text: this.translate.instant('OK'), role: 'confirm' },
      ],
    });
    await alert.present();
    const { data, role } = await alert.onDidDismiss();
    return role === 'confirm' ? data?.values?.value || null : null;
  }

  /** Show track information; look up full track details if requested. */
  async trackInfo(track: Track, lookup = false): Promise<void> {
    if (lookup) {
      const result: Record<string, Track[]> = await this.connection.call((mopidy) =>
        mopidy.library.lookup({ uris: [track.uri] }),
      );
      const tracks = result[track.uri];
      if (tracks?.length) {
        track = { ...track, ...tracks[0] };
      }
    }
    const modal = await this.modals.create({ component: TrackInfoComponent, componentProps: { track } });
    await modal.present();
  }

  /** Select a playlist, and add a track or other item to it. */
  async addToPlaylist(item: Model): Promise<void> {
    const playlists: Ref[] = await this.connection.call((mopidy) => mopidy.playlists.asList());
    const modal = await this.modals.create({ component: SelectPlaylistComponent, componentProps: { playlists } });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<string>();
    if (role === 'confirm' && data) {
      await this.actions.addToPlaylist(data, item);
    }
  }

  /** Enter a new stream URL, and optionally a name. */
  async addStream(withName = false): Promise<Stream | null> {
    const modal = await this.modals.create({ component: AddStreamComponent, componentProps: { withName } });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<Stream>();
    return role === 'confirm' && data ? data : null;
  }
}
