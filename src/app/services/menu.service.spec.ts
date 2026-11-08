import { TestBed } from '@angular/core/testing';
import { PopoverController } from '@ionic/angular/standalone';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { track } from '../../testing/mopidy';
import { MenuComponent, MenuItem } from '../shared/menu.component';
import { ActionsService } from './actions.service';
import { MenuService } from './menu.service';
import { PopupService } from './popup.service';

describe('MenuService', () => {
  let service: MenuService;
  let popovers: { create: ReturnType<typeof vi.fn> };
  let popover: { present: ReturnType<typeof vi.fn> };
  let actions: Record<string, ReturnType<typeof vi.fn>>;
  let popup: Record<string, ReturnType<typeof vi.fn>>;

  const a = track('local:track:a');
  const b = track('local:track:b');

  beforeEach(() => {
    popover = { present: vi.fn().mockResolvedValue(undefined) };
    popovers = { create: vi.fn().mockResolvedValue(popover) };
    actions = { play: vi.fn(), next: vi.fn(), add: vi.fn(), replace: vi.fn() };
    popup = { addToPlaylist: vi.fn(), trackInfo: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: PopoverController, useValue: popovers },
        { provide: ActionsService, useValue: actions },
        { provide: PopupService, useValue: popup },
      ],
    });
    service = TestBed.inject(MenuService);
  });

  function event(): Event {
    const event = new MouseEvent('click', { cancelable: true, bubbles: true });
    vi.spyOn(event, 'stopPropagation');
    return event;
  }

  function items(): MenuItem[] {
    return popovers.create.mock.calls[0][0].componentProps.items;
  }

  function item(text: string): MenuItem {
    const found = items().find((item) => item.text === text);
    if (!found) {
      throw new Error('Menu item not found: ' + text);
    }
    return found;
  }

  it('shows a popover menu for the event', async () => {
    const e = event();
    const menu: MenuItem[] = [{ text: 'Clear' }];
    await service.show(e, menu);
    expect(e.defaultPrevented).toBe(true);
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(popovers.create).toHaveBeenCalledWith({
      component: MenuComponent,
      componentProps: { items: menu },
      cssClass: 'app-menu',
      event: e,
    });
    expect(popover.present).toHaveBeenCalledTimes(1);
  });

  it('shows a menu for library tracks', async () => {
    await service.track(event(), a);
    expect(items().map((item) => item.text)).toEqual([
      'Play now',
      'Play next',
      'Add to tracklist',
      'Add to playlist',
      'Show track info',
    ]);
    item('Play now').handler!();
    item('Play next').handler!();
    item('Add to tracklist').handler!();
    item('Add to playlist').handler!();
    item('Show track info').handler!();
    expect(actions.play).toHaveBeenCalledWith(a);
    expect(actions.next).toHaveBeenCalledWith(a);
    expect(actions.add).toHaveBeenCalledWith(a);
    expect(popup.addToPlaylist).toHaveBeenCalledWith(a);
    expect(popup.trackInfo).toHaveBeenCalledWith(a, true);
    expect(item('Add to playlist').hellip).toBe(true);
    expect(item('Show track info').hellip).toBe(true);
  });

  it('shows a menu for playlist items', async () => {
    await service.playlistItem(event(), a);
    expect(items().map((item) => item.text)).toEqual(['Play now', 'Play next', 'Add to tracklist', 'Show track info']);
    item('Show track info').handler!();
    expect(popup.trackInfo).toHaveBeenCalledWith(a, true);
  });

  it('shows a menu for the current track', async () => {
    await service.trackInfo(event(), a);
    expect(items().map((item) => item.text)).toEqual(['Add to playlist', 'Show track info']);
    expect(items().every((item) => !item.disabled)).toBe(true);
    item('Add to playlist').handler!();
    item('Show track info').handler!();
    expect(popup.addToPlaylist).toHaveBeenCalledWith(a);
    expect(popup.trackInfo).toHaveBeenCalledWith(a);
  });

  it('disables the current track menu without a track', async () => {
    await service.trackInfo(event(), null);
    expect(items().every((item) => item.disabled)).toBe(true);
    item('Add to playlist').handler!();
    item('Show track info').handler!();
    expect(popup.addToPlaylist).not.toHaveBeenCalled();
    expect(popup.trackInfo).not.toHaveBeenCalled();
  });

  it('shows a menu for lists of tracks', async () => {
    await service.tracks(event(), [a, b]);
    expect(items().map((item) => item.text)).toEqual(['Play now', 'Play next', 'Add to tracklist', 'Replace tracklist']);
    expect(items().every((item) => !item.disabled)).toBe(true);
    item('Play now').handler!();
    item('Play next').handler!();
    item('Add to tracklist').handler!();
    item('Replace tracklist').handler!();
    expect(actions.play).toHaveBeenCalledWith([a, b]);
    expect(actions.next).toHaveBeenCalledWith([a, b]);
    expect(actions.add).toHaveBeenCalledWith([a, b]);
    expect(actions.replace).toHaveBeenCalledWith([a, b]);
  });

  it('disables the track list menu for empty lists', async () => {
    await service.tracks(event(), []);
    expect(items().every((item) => item.disabled)).toBe(true);
  });
});
