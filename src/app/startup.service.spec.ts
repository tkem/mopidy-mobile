import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockConnectionService, provideMockConnection } from '../testing/connection';
import { flush } from '../testing/dom';
import { ActionsService } from './services/actions.service';
import { LoggingService } from './services/logging.service';
import { PlatformService } from './services/platform.service';
import { PreferencesService } from './services/preferences.service';
import { SettingsService } from './services/settings.service';
import { StartupService } from './startup.service';

describe('StartupService', () => {
  let connection: MockConnectionService;
  let actions: Record<string, ReturnType<typeof vi.fn>>;
  let platform: Record<string, unknown>;
  let listeners: Record<string, () => void>;
  let order: string[];
  let logging: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    order = [];
    listeners = {};
    connection = new MockConnectionService();
    actions = { increaseVolume: vi.fn(), decreaseVolume: vi.fn() };
    platform = {
      isWebView: vi.fn().mockReturnValue(false),
      isHosted: vi.fn().mockReturnValue(false),
      webSocketUrl: vi.fn().mockReturnValue(null),
      addEventListener: vi.fn((name: string, listener: () => void) => (listeners[name] = listener)),
      appVersion: vi.fn().mockResolvedValue('2.0.0'),
      version: signal(''),
    };
    TestBed.configureTestingModule({
      providers: [
        provideMockConnection(connection),
        { provide: ActionsService, useValue: actions },
        { provide: PlatformService, useValue: platform },
        { provide: PreferencesService, useValue: { applyAll: vi.fn(() => order.push('applyAll')) } },
        { provide: SettingsService, useValue: { migrate: vi.fn(() => order.push('migrate')) } },
      ],
    });
    logging = TestBed.inject(LoggingService);
    vi.spyOn(logging, 'info');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function init(): StartupService {
    const service = TestBed.inject(StartupService);
    service.init();
    return service;
  }

  it('migrates settings before applying preferences', () => {
    init();
    expect(order).toEqual(['migrate', 'applyAll']);
  });

  it('logs and publishes the application version', async () => {
    init();
    await flush();
    expect(logging.info).toHaveBeenCalledWith('Starting Mopidy Mobile 2.0.0');
    expect((platform['version'] as ReturnType<typeof signal<string>>)()).toBe('2.0.0');
  });

  it('does not connect or listen for volume keys in a browser', () => {
    init();
    expect(connection.reset).not.toHaveBeenCalled();
    expect(platform['addEventListener']).not.toHaveBeenCalled();
  });

  it('connects to the hosting server', () => {
    (platform['isHosted'] as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (platform['webSocketUrl'] as ReturnType<typeof vi.fn>).mockReturnValue('ws://host:6680/mopidy/ws');
    init();
    expect(connection.reset).toHaveBeenCalledWith('ws://host:6680/mopidy/ws');
  });

  it('maps volume keys to volume changes in a WebView', () => {
    (platform['isWebView'] as ReturnType<typeof vi.fn>).mockReturnValue(true);
    init();
    expect(Object.keys(listeners).sort()).toEqual(['volumedownbutton', 'volumeupbutton']);
    listeners['volumeupbutton']();
    listeners['volumedownbutton']();
    expect(actions.increaseVolume).toHaveBeenCalledTimes(1);
    expect(actions.decreaseVolume).toHaveBeenCalledTimes(1);
  });
});
