import { Injectable, inject } from '@angular/core';
import { PopoverController } from '@ionic/angular/standalone';

import { Model, Track } from '../models';
import { MenuComponent, MenuItem } from '../shared/menu.component';
import { ActionsService } from './actions.service';
import { PopupService } from './popup.service';

export type { MenuItem } from '../shared/menu.component';

/** Popover menus, including common menus for tracks and track lists. */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly actions = inject(ActionsService);
  private readonly popovers = inject(PopoverController);
  private readonly popup = inject(PopupService);

  async show(event: Event, items: MenuItem[]): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const popover = await this.popovers.create({
      component: MenuComponent,
      componentProps: { items },
      cssClass: 'app-menu',
      event,
    });
    await popover.present();
  }

  /** Menu for a library track. */
  track(event: Event, track: Model): Promise<void> {
    return this.show(event, [
      { text: 'Play now', handler: () => this.actions.play(track) },
      { text: 'Play next', handler: () => this.actions.next(track) },
      { text: 'Add to tracklist', handler: () => this.actions.add(track) },
      { text: 'Add to playlist', hellip: true, handler: () => this.popup.addToPlaylist(track) },
      { text: 'Show track info', hellip: true, handler: () => this.popup.trackInfo(track, true) },
    ]);
  }

  /** Menu for a playlist item. */
  playlistItem(event: Event, item: Model): Promise<void> {
    return this.show(event, [
      { text: 'Play now', handler: () => this.actions.play(item) },
      { text: 'Play next', handler: () => this.actions.next(item) },
      { text: 'Add to tracklist', handler: () => this.actions.add(item) },
      { text: 'Show track info', hellip: true, handler: () => this.popup.trackInfo(item, true) },
    ]);
  }

  /** Menu for the current track, or a tracklist item. */
  trackInfo(event: Event, track: Track | null): Promise<void> {
    return this.show(event, [
      { text: 'Add to playlist', hellip: true, disabled: !track, handler: () => track && this.popup.addToPlaylist(track) },
      { text: 'Show track info', hellip: true, disabled: !track, handler: () => track && this.popup.trackInfo(track) },
    ]);
  }

  /** Menu for a list of tracks. */
  tracks(event: Event, tracks: Model[]): Promise<void> {
    const disabled = !tracks.length;
    return this.show(event, [
      { text: 'Play now', disabled, handler: () => this.actions.play(tracks) },
      { text: 'Play next', disabled, handler: () => this.actions.next(tracks) },
      { text: 'Add to tracklist', disabled, handler: () => this.actions.add(tracks) },
      { text: 'Replace tracklist', disabled, handler: () => this.actions.replace(tracks) },
    ]);
  }
}
