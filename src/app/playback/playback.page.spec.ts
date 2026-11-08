import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RangeCustomEvent, RefresherCustomEvent } from '@ionic/angular/standalone';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flush } from '../../testing/dom';
import { track } from '../../testing/mopidy';
import { refresherEvent } from '../../testing/router';
import { Track } from '../models';
import { MenuService } from '../services/menu.service';
import { MixerService, PlaybackService } from '../services/playback.service';
import { PlaybackPage } from './playback.page';

describe('PlaybackPage', () => {
  let page: PlaybackPage;
  let playback: { track: ReturnType<typeof signal<Track | null>>; start: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn>; seek: ReturnType<typeof vi.fn> };
  let mixer: { start: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn>; setVolume: ReturnType<typeof vi.fn> };
  let menu: { trackInfo: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    playback = {
      track: signal<Track | null>(null),
      start: vi.fn(),
      reload: vi.fn().mockResolvedValue(undefined),
      seek: vi.fn().mockResolvedValue(undefined),
    };
    mixer = { start: vi.fn(), reload: vi.fn().mockResolvedValue(undefined), setVolume: vi.fn() };
    menu = { trackInfo: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: PlaybackService, useValue: playback },
        { provide: MixerService, useValue: mixer },
        { provide: MenuService, useValue: menu },
      ],
    });
    page = TestBed.runInInjectionContext(() => new PlaybackPage());
  });

  it('starts playback and mixer state loading', () => {
    page.ngOnInit();
    expect(playback.start).toHaveBeenCalled();
    expect(mixer.start).toHaveBeenCalled();
  });

  it('reloads both on refresh', async () => {
    const event = refresherEvent();
    page.refresh(event as unknown as RefresherCustomEvent);
    await flush();
    expect(playback.reload).toHaveBeenCalled();
    expect(mixer.reload).toHaveBeenCalled();
    expect(event.target.complete).toHaveBeenCalled();
  });

  it('shows the menu for the current track', () => {
    const current = track('local:track:1');
    playback.track.set(current);
    const event = new Event('click');
    page.showMenu(event);
    expect(menu.trackInfo).toHaveBeenCalledWith(event, current);
  });

  it('forwards volume and position changes', () => {
    page.setVolume({ detail: { value: 42 } } as unknown as RangeCustomEvent);
    expect(mixer.setVolume).toHaveBeenCalledWith(42);
    page.seek({ detail: { value: 12345 } } as unknown as RangeCustomEvent);
    expect(playback.seek).toHaveBeenCalledWith(12345);
  });
});
