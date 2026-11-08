/* eslint-disable @typescript-eslint/no-explicit-any -- Mopidy's API is dynamic */
import { Provider } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import { vi } from 'vitest';

import { ConnectionService } from '../app/services/connection.service';
import { createMopidyApi } from './mopidy';

/**
 * A mock `ConnectionService`, calling request functions with a fake
 * Mopidy API, and letting tests emit connection and Mopidy events.
 */
export class MockConnectionService {
  connectionTimeout: number | null = null;
  requestTimeout: number | null = null;

  /** The fake Mopidy API passed to request functions. */
  mopidy = createMopidyApi();

  /** Settings as returned by `getSettings()`. */
  settings = { webSocketUrl: 'ws://mopidy.local:6680/mopidy/ws/' };

  private readonly events = new Subject<{ name: string; data: unknown }>();

  readonly get = vi.fn(() => Promise.resolve(this.mopidy));
  readonly call = vi.fn((fn: (mopidy: any) => unknown) => Promise.resolve().then(() => fn(this.mopidy)));
  readonly reset = vi.fn(() => Promise.resolve(this.mopidy));
  readonly close = vi.fn();
  readonly getSettings = vi.fn(() => ({ ...this.settings }));

  on<T = any>(name: string): Observable<T> {
    return this.events.pipe(
      filter((event) => event.name === name),
      map((event) => event.data as T),
    );
  }

  /** Emit a connection state or Mopidy event, e.g. `emit('event:seeked', { time_position: 0 })`. */
  emit(name: string, data?: unknown): void {
    this.events.next({ name, data });
  }

  /** Make all requests fail with the given error. */
  fail(error: unknown): void {
    this.get.mockImplementation(() => Promise.reject(error));
    this.call.mockImplementation(() => Promise.reject(error));
  }
}

/** Provide a `MockConnectionService` as the `ConnectionService`. */
export function provideMockConnection(mock = new MockConnectionService()): Provider {
  return { provide: ConnectionService, useValue: mock };
}
