import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flush, textsOf } from '../../testing/dom';
import { CoverartService } from '../services/coverart.service';
import { LoggingService, LogRecord } from '../services/logging.service';
import { MenuItem, MenuService } from '../services/menu.service';
import { PlatformService } from '../services/platform.service';
import { PopupService } from '../services/popup.service';
import { PreferencesService } from '../services/preferences.service';
import { DEFAULT_SETTINGS, SettingsService } from '../services/settings.service';
import { AboutPage } from './about.page';
import { CoverartPage } from './coverart.page';
import { LicensesPage } from './licenses.page';
import { LoggingPage } from './logging.page';
import { SettingsPage } from './settings.page';
import { UiPage } from './ui.page';

function menuItems(menu: { show: ReturnType<typeof vi.fn> }): MenuItem[] {
  return menu.show.mock.calls[0][1];
}

function menuItem(menu: { show: ReturnType<typeof vi.fn> }, text: string): MenuItem {
  const item = menuItems(menu).find((item) => item.text === text);
  if (!item) {
    throw new Error('Menu item not found: ' + text);
  }
  return item;
}

describe('SettingsPage', () => {
  let page: SettingsPage;
  let menu: { show: ReturnType<typeof vi.fn> };
  let popup: { confirm: ReturnType<typeof vi.fn> };
  let platform: Record<string, ReturnType<typeof vi.fn>>;
  let splashscreen: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let settings: SettingsService;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // jsdom: navigation not implemented
    localStorage.clear();
    menu = { show: vi.fn() };
    popup = { confirm: vi.fn().mockResolvedValue(false) };
    splashscreen = { show: vi.fn(), hide: vi.fn() };
    platform = {
      isHosted: vi.fn().mockReturnValue(false),
      isWebView: vi.fn().mockReturnValue(false),
      exitApp: vi.fn(),
      splashscreen: vi.fn().mockResolvedValue(splashscreen),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuService, useValue: menu },
        { provide: PopupService, useValue: popup },
        { provide: PlatformService, useValue: platform },
      ],
    });
    settings = TestBed.inject(SettingsService);
    vi.spyOn(settings, 'clear');
    page = TestBed.runInInjectionContext(() => new SettingsPage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows reset, restart and exit menu items', () => {
    page.showMenu(new Event('click'));
    expect(menuItems(menu).map((item) => [item.text, !!item.hidden])).toEqual([
      ['Reset', false],
      ['Restart', false],
      ['Exit', true],
    ]);
    menuItem(menu, 'Exit').handler!();
    expect(platform.exitApp).toHaveBeenCalled();
  });

  it('offers to exit in a WebView', () => {
    platform.isWebView.mockReturnValue(true);
    page.showMenu(new Event('click'));
    expect(menuItem(menu, 'Exit').hidden).toBe(false);
  });

  it('resets settings after confirmation', async () => {
    settings.extend({ locale: 'de' });
    await page.reset();
    expect(popup.confirm).toHaveBeenCalledWith('Reset all settings to default values and restart application');
    expect(settings.clear).not.toHaveBeenCalled();
    popup.confirm.mockResolvedValue(true);
    await page.reset();
    expect(settings.clear).toHaveBeenCalled();
    expect(settings.get()).toEqual(DEFAULT_SETTINGS);
    expect(splashscreen.show).toHaveBeenCalled();
  });

  it('shows the splash screen while restarting', async () => {
    await page.restart();
    expect(splashscreen.show).toHaveBeenCalled();
  });
});

describe('UiPage', () => {
  let page: UiPage;
  let preferences: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    preferences = {
      get: vi.fn().mockReturnValue({ ...DEFAULT_SETTINGS, theme: 'dark' }),
      setTheme: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PreferencesService, useValue: preferences },
        { provide: PlatformService, useValue: { isWebView: () => false } },
      ],
    });
    page = TestBed.runInInjectionContext(() => new UiPage());
  });

  it('exposes the current settings and available options', () => {
    expect(page.settings.theme).toBe('dark');
    expect(page.locales.map((locale) => locale.id)).toEqual(['ca', 'de', 'en', 'es', 'fr', 'nb', 'nl', 'pl', 'sk']);
    expect(page.locales.find((locale) => locale.id === 'de')?.displayName).toBe('Deutsch');
    expect(page.timeouts).toEqual([5, 10, 15, 30, 60]);
    expect(page.volumeSteps).toHaveLength(10);
  });

  it('sets the theme', () => {
    page.setTheme('light');
    expect(preferences.setTheme).toHaveBeenCalledWith('light');
  });
});

describe('CoverartPage', () => {
  let page: CoverartPage;
  let preferences: Record<string, ReturnType<typeof vi.fn>>;
  let coverart: { clearCache: ReturnType<typeof vi.fn> };
  let menu: { show: ReturnType<typeof vi.fn> };

  function toggle(id: string, checked: boolean): void {
    page.toggle(id, new CustomEvent('ionChange', { detail: { checked, value: 'on' } }));
  }

  beforeEach(() => {
    preferences = {
      get: vi.fn().mockReturnValue({ ...DEFAULT_SETTINGS, coverart: ['lastfm'] }),
      setCoverart: vi.fn(),
    };
    coverart = { clearCache: vi.fn() };
    menu = { show: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: PreferencesService, useValue: preferences },
        { provide: CoverartService, useValue: coverart },
        { provide: MenuService, useValue: menu },
      ],
    });
    page = TestBed.runInInjectionContext(() => new CoverartPage());
  });

  it('lists the providers in order of preference', () => {
    expect(page.providers.map((provider) => provider.id)).toEqual(['mopidy', 'lastfm', 'archive']);
    expect(page.enabled).toEqual(['lastfm']);
  });

  it('enables and disables providers, keeping their order', () => {
    toggle('archive', true);
    expect(page.enabled).toEqual(['lastfm', 'archive']);
    expect(preferences.setCoverart).toHaveBeenLastCalledWith(['lastfm', 'archive']);
    toggle('mopidy', true);
    expect(page.enabled).toEqual(['mopidy', 'lastfm', 'archive']);
    toggle('lastfm', false);
    expect(page.enabled).toEqual(['mopidy', 'archive']);
    expect(preferences.setCoverart).toHaveBeenLastCalledWith(['mopidy', 'archive']);
  });

  it('offers to clear the cache', () => {
    page.showMenu(new Event('click'));
    menuItem(menu, 'Clear cache').handler!();
    expect(coverart.clearCache).toHaveBeenCalled();
  });
});

describe('LoggingPage', () => {
  let page: LoggingPage;
  let logging: LoggingService;
  let menu: { show: ReturnType<typeof vi.fn> };
  let platform: Record<string, unknown>;
  let preferences: { setDebug: ReturnType<typeof vi.fn> };
  let share: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    menu = { show: vi.fn() };
    share = vi.fn().mockResolvedValue('ok');
    platform = { canShare: vi.fn().mockReturnValue(true), share, version: signal('2.0.0') };
    preferences = { setDebug: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuService, useValue: menu },
        { provide: PlatformService, useValue: platform },
        { provide: PreferencesService, useValue: preferences },
      ],
    });
    logging = TestBed.inject(LoggingService);
    page = TestBed.runInInjectionContext(() => new LoggingPage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps log levels to icons and colors', () => {
    expect(page.icon('debug')).toBe('bug');
    expect(page.icon('error')).toBe('alert-circle');
    expect(page.icon('info')).toBe('information-circle');
    expect(page.icon('bogus')).toBe('information-circle');
    expect(page.color('error')).toBe('danger');
    expect(page.color('warn')).toBe('warning');
    expect(page.color('info')).toBeUndefined();
  });

  it('expands and collapses records', () => {
    const record: LogRecord = { time: 0, level: 'info', args: [] };
    page.toggle(record);
    expect(page.expanded().has(record)).toBe(true);
    page.toggle(record);
    expect(page.expanded().has(record)).toBe(false);
  });

  it('stringifies log arguments', () => {
    expect(page.stringify('text')).toBe('"text"');
    expect(page.stringify({ a: 1 })).toBe('{"a":1}');
    expect(page.stringify(undefined)).toBe('undefined');
    const error = new Error('boom');
    expect(page.stringify(error)).toBe(error.stack);
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(page.stringify(circular)).toBe('[object Object]');
    class Empty {}
    expect(page.stringify(new Empty())).toBe('[object Object]');
  });

  it('shows the logging menu', () => {
    logging.debugEnabled = true;
    page.showMenu(new Event('click'));
    const items = menuItems(menu);
    expect(items.map((item) => item.text)).toEqual(['Debug messages', 'Share', 'Clear']);
    expect(items[0].checked).toBe(true);
    items[0].toggle!(false);
    expect(preferences.setDebug).toHaveBeenCalledWith(false);
    expect(items[1].hidden).toBe(false);
    vi.spyOn(logging, 'clear');
    items[2].handler!();
    expect(logging.clear).toHaveBeenCalled();
  });

  it('hides sharing when not supported', () => {
    (platform['canShare'] as ReturnType<typeof vi.fn>).mockReturnValue(false);
    page.showMenu(new Event('click'));
    expect(menuItem(menu, 'Share').hidden).toBe(true);
  });

  it('shares the log', async () => {
    logging.info('hello', { a: 1 });
    logging.error('oops');
    await flush();
    await page.share();
    expect(share).toHaveBeenCalledTimes(1);
    const [subject, message] = share.mock.calls[0];
    expect(subject).toBe('Mopidy Mobile 2.0.0');
    const lines = message.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^info\t\d+\t"hello" {"a":1}$/);
    expect(lines[1]).toMatch(/^error\t\d+\t"oops"$/);
  });

  it('logs sharing errors', async () => {
    vi.spyOn(logging, 'error');
    share.mockRejectedValue('nope');
    await page.share();
    expect(logging.error).toHaveBeenCalledWith('Error sharing log:', 'nope');
  });
});

describe('LicensesPage', () => {
  async function render(isWebView: boolean): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [LicensesPage],
      providers: [{ provide: PlatformService, useValue: { isWebView: () => isWebView, openExternal: vi.fn() } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LicensesPage);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('lists web licenses only in a browser', async () => {
    const el = await render(false);
    const names = textsOf(el, 'ion-item h2');
    expect(names).toEqual(['Mopidy.js', 'Ionic', 'Ionicons', 'Angular', 'RxJS', 'messageformat']);
  });

  it('lists app licenses as well in a WebView', async () => {
    const el = await render(true);
    const names = textsOf(el, 'ion-item h2');
    expect(names).toHaveLength(10);
    expect(names).toContain('Apache Cordova');
    expect(el.querySelectorAll('a[href]').length).toBe(20);
  });
});

describe('AboutPage', () => {
  it('shows the application version', async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [{ provide: PlatformService, useValue: { version: signal('2.0.0'), openExternal: vi.fn() } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    expect(textsOf(fixture.nativeElement, 'h1')).toEqual(['Mopidy Mobile 2.0.0']);
  });
});
