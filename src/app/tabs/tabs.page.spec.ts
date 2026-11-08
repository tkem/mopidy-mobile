import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { describe, expect, it } from 'vitest';

import { textsOf } from '../../testing/dom';
import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  it('renders a tab for every main view', async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();
    const fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(el.querySelectorAll('ion-tab-button')).map((button) => button.getAttribute('tab'));
    expect(tabs).toEqual(['playback', 'tracklist', 'library', 'playlists', 'settings']);
    expect(textsOf(el, 'ion-tab-button ion-label')).toEqual(['Playback', 'Tracklist', 'Library', 'Playlists', 'Settings']);
  });
});
