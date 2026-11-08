import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ItemReorderEventDetail, NavController, PopoverController, RefresherCustomEvent } from '@ionic/angular/standalone';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { click, flush, textsOf } from '../../testing/dom';
import { tlTrack } from '../../testing/mopidy';
import { mockNavController, refresherEvent } from '../../testing/router';
import { TlTrack, TracklistOptions } from '../models';
import { MenuService } from '../services/menu.service';
import { PopupService } from '../services/popup.service';
import { TracklistService } from '../services/tracklist.service';
import { TracklistEditPage } from './tracklist-edit.page';
import { TracklistMenuComponent, showTracklistMenu } from './tracklist-menu.component';
import { TracklistPage } from './tracklist.page';

function mockTracklistService() {
  return {
    tlTracks: signal<TlTrack[]>([tlTrack(1), tlTrack(2)]),
    currentTlTrack: signal<TlTrack | null>(null),
    options: signal<TracklistOptions>({}),
    images: signal({}),
    start: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue([]),
    move: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    saveAs: vi.fn().mockResolvedValue(undefined),
    confirmClear: vi.fn().mockResolvedValue(undefined),
    toggleConsume: vi.fn(),
    toggleRandom: vi.fn(),
    toggleRepeat: vi.fn(),
    toggleSingle: vi.fn(),
  };
}

describe('showTracklistMenu', () => {
  it('presents the tracklist menu as a popover', async () => {
    const popover = { present: vi.fn().mockResolvedValue(undefined) };
    const popovers = { create: vi.fn().mockResolvedValue(popover) };
    const event = new Event('click');
    await showTracklistMenu(popovers as unknown as PopoverController, event);
    expect(popovers.create).toHaveBeenCalledWith({ component: TracklistMenuComponent, cssClass: 'app-menu', event });
    expect(popover.present).toHaveBeenCalled();
  });
});

describe('TracklistPage', () => {
  let page: TracklistPage;
  let tracklist: ReturnType<typeof mockTracklistService>;
  let popovers: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tracklist = mockTracklistService();
    popovers = { create: vi.fn().mockResolvedValue({ present: vi.fn().mockResolvedValue(undefined) }) };
    TestBed.configureTestingModule({
      providers: [
        { provide: TracklistService, useValue: tracklist },
        { provide: MenuService, useValue: { trackInfo: vi.fn() } },
        { provide: PopoverController, useValue: popovers },
      ],
    });
    page = TestBed.runInInjectionContext(() => new TracklistPage());
  });

  it('starts loading the tracklist', () => {
    page.ngOnInit();
    expect(tracklist.start).toHaveBeenCalled();
  });

  it('refreshes the tracklist', async () => {
    const event = refresherEvent();
    page.refresh(event as unknown as RefresherCustomEvent);
    await flush();
    expect(tracklist.reload).toHaveBeenCalled();
    expect(event.target.complete).toHaveBeenCalled();
  });

  it('shows the tracklist menu', async () => {
    page.showMenu(new Event('click'));
    await flush();
    expect(popovers.create).toHaveBeenCalledWith(expect.objectContaining({ component: TracklistMenuComponent }));
  });
});

describe('TracklistEditPage', () => {
  let page: TracklistEditPage;
  let tracklist: ReturnType<typeof mockTracklistService>;
  let nav: ReturnType<typeof mockNavController>;
  let popup: { addStream: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tracklist = mockTracklistService();
    nav = mockNavController();
    popup = { addStream: vi.fn().mockResolvedValue(null) };
    TestBed.configureTestingModule({
      providers: [
        { provide: TracklistService, useValue: tracklist },
        { provide: NavController, useValue: nav },
        { provide: PopupService, useValue: popup },
        { provide: PopoverController, useValue: { create: vi.fn().mockResolvedValue({ present: vi.fn() }) } },
      ],
    });
    page = TestBed.runInInjectionContext(() => new TracklistEditPage());
  });

  it('goes back when done', () => {
    page.done();
    expect(nav.back).toHaveBeenCalled();
  });

  it('adds streams to the tracklist', async () => {
    await page.addStream();
    expect(popup.addStream).toHaveBeenCalledWith(false);
    expect(tracklist.add).not.toHaveBeenCalled();
    popup.addStream.mockResolvedValue({ name: '', uri: 'http://radio/' });
    await page.addStream();
    expect(tracklist.add).toHaveBeenCalledWith('http://radio/');
  });

  it('moves reordered tracks', () => {
    const complete = vi.fn();
    const reorder = (from: number, to: number) =>
      page.reorder(new CustomEvent('ionItemReorder', { detail: { from, to, complete } as unknown as ItemReorderEventDetail }));
    reorder(0, 1);
    expect(complete).toHaveBeenCalledWith(false);
    expect(tracklist.move).toHaveBeenCalledWith(0, 1);
    reorder(1, 1);
    expect(tracklist.move).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

describe('TracklistMenuComponent', () => {
  let tracklist: ReturnType<typeof mockTracklistService>;
  let popover: { dismiss: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    tracklist = mockTracklistService();
    popover = { dismiss: vi.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [TracklistMenuComponent],
      providers: [
        { provide: TracklistService, useValue: tracklist },
        { provide: PopoverController, useValue: popover },
      ],
    }).compileComponents();
  });

  it('renders the tracklist options and actions', () => {
    const fixture = TestBed.createComponent(TracklistMenuComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.options ion-button')).toHaveLength(4);
    expect(textsOf(el, 'ion-label')).toEqual(['Save as…', 'Clear…']);
  });

  it('toggles options', () => {
    const fixture = TestBed.createComponent(TracklistMenuComponent);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.options ion-button');
    click(buttons[0]);
    click(buttons[1]);
    click(buttons[2]);
    click(buttons[3]);
    expect(tracklist.toggleConsume).toHaveBeenCalled();
    expect(tracklist.toggleRandom).toHaveBeenCalled();
    expect(tracklist.toggleRepeat).toHaveBeenCalled();
    expect(tracklist.toggleSingle).toHaveBeenCalled();
  });

  it('dismisses the menu before saving or clearing', async () => {
    const fixture = TestBed.createComponent(TracklistMenuComponent);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('ion-item[button]');
    click(items[0]);
    await flush();
    expect(popover.dismiss).toHaveBeenCalledTimes(1);
    expect(tracklist.saveAs).toHaveBeenCalledTimes(1);
    click(items[1]);
    await flush();
    expect(popover.dismiss).toHaveBeenCalledTimes(2);
    expect(tracklist.confirmClear).toHaveBeenCalledTimes(1);
  });

  it('disables actions for an empty tracklist', () => {
    tracklist.tlTracks.set([]);
    const fixture = TestBed.createComponent(TracklistMenuComponent);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('ion-item[button]') as NodeListOf<HTMLElement & { disabled: boolean }>;
    expect(items[0].disabled).toBe(true);
    expect(items[1].disabled).toBe(true);
  });
});
