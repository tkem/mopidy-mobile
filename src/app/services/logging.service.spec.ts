import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flush } from '../../testing/dom';
import { AppErrorHandler, LoggingService, reportedErrors } from './logging.service';

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    service = TestBed.inject(LoggingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes to the console', () => {
    service.info('hello', 42);
    service.warn('careful');
    service.error('oops', { code: 1 });
    expect(console.info).toHaveBeenCalledWith('hello', 42);
    expect(console.warn).toHaveBeenCalledWith('careful');
    expect(console.error).toHaveBeenCalledWith('oops', { code: 1 });
  });

  it('records messages asynchronously', async () => {
    service.info('one');
    service.warn('two');
    expect(service.records()).toEqual([]);
    await flush();
    const records = service.records();
    expect(records.map((record) => record.level)).toEqual(['info', 'warn']);
    expect(records.map((record) => record.args)).toEqual([['one'], ['two']]);
    expect(records.every((record) => typeof record.time === 'number')).toBe(true);
  });

  it('only records debug messages when enabled', async () => {
    service.debug('hidden');
    expect(console.debug).toHaveBeenCalledWith('hidden');
    await flush();
    expect(service.records()).toEqual([]);

    service.debugEnabled = true;
    service.debug('shown');
    await flush();
    expect(service.records().map((record) => record.args)).toEqual([['shown']]);
  });

  it('keeps only the most recent messages', async () => {
    service.maxBufferSize = 3;
    for (let i = 0; i < 5; ++i) {
      service.info(i);
    }
    await flush();
    expect(service.records().map((record) => record.args[0])).toEqual([2, 3, 4]);
  });

  it('clears recorded messages', async () => {
    service.info('one');
    await flush();
    service.clear();
    expect(service.records()).toEqual([]);
    service.info('two');
    await flush();
    expect(service.records().map((record) => record.args)).toEqual([['two']]);
  });
});

describe('AppErrorHandler', () => {
  let logging: LoggingService;
  let handler: AppErrorHandler;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [AppErrorHandler] });
    logging = TestBed.inject(LoggingService);
    handler = TestBed.inject(AppErrorHandler);
    vi.spyOn(logging, 'error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs uncaught errors', () => {
    const error = new Error('boom');
    handler.handleError(error);
    expect(logging.error).toHaveBeenCalledWith('Uncaught error:', error);
  });

  it('unwraps unhandled promise rejections', () => {
    const reason = new Error('rejected');
    handler.handleError({ rejection: reason, promise: Promise.resolve() });
    expect(logging.error).toHaveBeenCalledWith('Uncaught error:', reason);
  });

  it('skips errors already reported to the user', () => {
    const error = new Error('ignored by user');
    reportedErrors.add(error);
    handler.handleError(error);
    handler.handleError({ rejection: error });
    expect(logging.error).not.toHaveBeenCalled();
  });

  it('logs primitive values', () => {
    handler.handleError('string error');
    expect(logging.error).toHaveBeenCalledWith('Uncaught error:', 'string error');
  });
});
