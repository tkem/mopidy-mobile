import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is inactive initially', () => {
    expect(service.active()).toBe(false);
  });

  it('becomes active after a short delay', () => {
    service.show();
    expect(service.active()).toBe(false);
    vi.advanceTimersByTime(99);
    expect(service.active()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(service.active()).toBe(true);
  });

  it('does not show for quick operations', () => {
    service.show();
    vi.advanceTimersByTime(50);
    service.hide();
    vi.advanceTimersByTime(100);
    expect(service.active()).toBe(false);
  });

  it('counts nested show/hide calls', () => {
    service.show();
    service.show();
    vi.advanceTimersByTime(100);
    expect(service.active()).toBe(true);
    service.hide();
    expect(service.active()).toBe(true);
    service.hide();
    expect(service.active()).toBe(false);
  });

  it('ignores unbalanced hide calls', () => {
    service.hide();
    service.show();
    vi.advanceTimersByTime(100);
    expect(service.active()).toBe(true);
    service.hide();
    expect(service.active()).toBe(false);
  });
});
