import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { click, textsOf } from '../../testing/dom';
import { ref, track } from '../../testing/mopidy';
import { PlatformService } from '../services/platform.service';
import { AddStreamComponent } from './add-stream.component';
import { ExternalLinkDirective } from './external-link.directive';
import { SelectPlaylistComponent } from './select-playlist.component';
import { TrackInfoComponent } from './track-info.component';

describe('ExternalLinkDirective', () => {
  @Component({
    imports: [ExternalLinkDirective],
    template: `<a appExternal="https://example.com/">Example</a>`,
  })
  class HostComponent {}

  let platform: { openExternal: ReturnType<typeof vi.fn> };
  let link: HTMLAnchorElement;

  beforeEach(async () => {
    platform = { openExternal: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: PlatformService, useValue: platform }],
    }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    link = fixture.nativeElement.querySelector('a');
  });

  it('renders a link opening in a new window', () => {
    expect(link.getAttribute('href')).toBe('https://example.com/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
  });

  it('opens the link via the platform instead of navigating', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(platform.openExternal).toHaveBeenCalledWith('https://example.com/');
  });
});

describe('AddStreamComponent', () => {
  let modal: { dismiss: ReturnType<typeof vi.fn> };
  let component: AddStreamComponent;

  beforeEach(() => {
    modal = { dismiss: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({ providers: [{ provide: ModalController, useValue: modal }] });
    component = TestBed.runInInjectionContext(() => new AddStreamComponent());
  });

  it('dismisses with the entered stream', () => {
    component.name = 'Radio';
    component.uri = 'http://radio/';
    component.submit();
    expect(modal.dismiss).toHaveBeenCalledWith({ name: 'Radio', uri: 'http://radio/' }, 'confirm');
  });

  it('dismisses with the cancel role', () => {
    component.cancel();
    expect(modal.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});

describe('AddStreamComponent template', () => {
  it('renders the name input only when requested', async () => {
    await TestBed.configureTestingModule({
      imports: [AddStreamComponent],
      providers: [{ provide: ModalController, useValue: { dismiss: vi.fn() } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AddStreamComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-input')).toHaveLength(1);
    fixture.componentInstance.withName = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-input')).toHaveLength(2);
  });
});

describe('SelectPlaylistComponent', () => {
  let modal: { dismiss: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    modal = { dismiss: vi.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [SelectPlaylistComponent],
      providers: [{ provide: ModalController, useValue: modal }],
    }).compileComponents();
  });

  it('lists playlists and dismisses with the selected URI', () => {
    const fixture = TestBed.createComponent(SelectPlaylistComponent);
    fixture.componentInstance.playlists = [
      ref('m3u:a', 'playlist', { name: 'A' }),
      ref('m3u:b', 'playlist', { name: undefined }),
    ];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(textsOf(el, 'ion-item ion-label')).toEqual(['A', 'm3u:b']);
    click(el.querySelectorAll('ion-item')[1]);
    expect(modal.dismiss).toHaveBeenCalledWith('m3u:b', 'confirm');
  });

  it('dismisses on cancel', () => {
    const fixture = TestBed.createComponent(SelectPlaylistComponent);
    fixture.detectChanges();
    click(fixture.nativeElement.querySelector('ion-buttons ion-button'));
    expect(modal.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});

describe('TrackInfoComponent', () => {
  let modal: { dismiss: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    modal = { dismiss: vi.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [TrackInfoComponent],
      providers: [{ provide: ModalController, useValue: modal }],
    }).compileComponents();
  });

  it('shows the available track details', () => {
    const fixture = TestBed.createComponent(TrackInfoComponent);
    fixture.componentInstance.track = track('local:track:1', {
      name: 'Song',
      artists: [{ name: 'Artist' }],
      album: { name: 'Album', artists: [{ name: 'Album Artist' }] },
      composers: [{ name: 'Composer' }],
      track_no: 3,
      disc_no: 1,
      genre: 'Jazz',
      date: '1959',
      length: 125000,
      bitrate: 320,
      comment: 'Nice',
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(textsOf(el, 'ion-item h2')).toEqual([
      'Song',
      'Album',
      'Artist',
      'Composer',
      'Album Artist',
      '3',
      '1',
      'Jazz',
      '1959',
      '2:05',
      '320',
      'Nice',
    ]);
    expect(textsOf(el, 'ion-item p')).toEqual([
      'Track',
      'Album',
      'Artist',
      'Composer',
      'Album artist',
      'Track number',
      'Disc number',
      'Genre',
      'Date',
      'Duration',
      'Bitrate',
      'Comment',
    ]);
  });

  it('omits missing details', () => {
    const fixture = TestBed.createComponent(TrackInfoComponent);
    fixture.componentInstance.track = { uri: 'http://stream/' };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-item')).toHaveLength(0);
  });

  it('closes the dialog', () => {
    const fixture = TestBed.createComponent(TrackInfoComponent);
    fixture.componentInstance.track = track('local:track:1');
    fixture.detectChanges();
    click(fixture.nativeElement.querySelector('ion-button'));
    expect(modal.dismiss).toHaveBeenCalledWith();
  });
});
