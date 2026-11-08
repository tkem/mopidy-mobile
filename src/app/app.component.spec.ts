import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Platform, provideIonicAngular } from '@ionic/angular/standalone';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppComponent } from './app.component';
import { LoadingService } from './services/loading.service';
import { PlatformService } from './services/platform.service';

describe('AppComponent', () => {
  type Handler = (processNextHandler: () => void) => void;
  let handlers: Record<number, Handler>;
  let platform: { exitApp: ReturnType<typeof vi.fn> };
  let url: string;

  beforeEach(async () => {
    handlers = {};
    url = '/';
    platform = { exitApp: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: PlatformService, useValue: platform },
        {
          provide: Platform,
          useValue: {
            backButton: {
              subscribeWithPriority: vi.fn((priority: number, fn: Handler) => {
                handlers[priority] = fn;
              }),
            },
          },
        },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'url', { get: () => url, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-app ion-router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.app-loading')).toBeNull();
  });

  it('shows the loading indicator while loading', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const loading = TestBed.inject(LoadingService);
    loading.show();
    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-loading ion-spinner')).not.toBeNull();
    loading.hide();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-loading')).toBeNull();
  });

  it('exits the app on the back button from top-level pages', () => {
    TestBed.createComponent(AppComponent);
    const backButton = handlers[10];
    expect(backButton).toBeDefined();
    const next = vi.fn();
    for (const page of ['/servers', '/playback', '/tracklist', '/library', '/playlists', '/settings']) {
      url = page;
      backButton(next);
    }
    url = '/playback?foo=bar';
    backButton(next);
    expect(platform.exitApp).toHaveBeenCalledTimes(7);
    expect(next).not.toHaveBeenCalled();
  });

  it('navigates back from other pages', () => {
    TestBed.createComponent(AppComponent);
    const backButton = handlers[10];
    const next = vi.fn();
    for (const page of ['/library/browse/local:directory', '/settings/about', '/servers/add', '/playlists/m3u:a']) {
      url = page;
      backButton(next);
    }
    expect(next).toHaveBeenCalledTimes(4);
    expect(platform.exitApp).not.toHaveBeenCalled();
  });
});
