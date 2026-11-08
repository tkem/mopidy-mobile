import { describe, expect, it, vi } from 'vitest';

import { paging } from './paging';

describe('paging', () => {
  it('processes items in chunks and reports each result', async () => {
    const fn = vi.fn((chunk: number[]) => Promise.resolve(chunk.reduce((a, b) => a + b, 0)));
    const results: number[] = [];
    await paging([1, 2, 3, 4, 5], 2, fn, (result) => results.push(result), new AbortController().signal);
    expect(fn.mock.calls.map(([chunk]) => chunk)).toEqual([[1, 2], [3, 4], [5]]);
    expect(results).toEqual([3, 7, 5]);
  });

  it('does nothing for an empty list', async () => {
    const fn = vi.fn();
    const onResult = vi.fn();
    await paging([], 10, fn, onResult, new AbortController().signal);
    expect(fn).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('stops when aborted, ignoring results of pending chunks', async () => {
    const abort = new AbortController();
    const fn = vi.fn((chunk: number[]) => {
      if (chunk[0] === 3) {
        abort.abort();
      }
      return Promise.resolve(chunk);
    });
    const onResult = vi.fn();
    await paging([1, 2, 3, 4, 5, 6], 2, fn, onResult, abort.signal);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith([1, 2]);
  });

  it('does not start when already aborted', async () => {
    const abort = new AbortController();
    abort.abort();
    const fn = vi.fn();
    await paging([1, 2], 1, fn, vi.fn(), abort.signal);
    expect(fn).not.toHaveBeenCalled();
  });

  it('propagates errors', async () => {
    const error = new Error('fail');
    await expect(paging([1], 1, () => Promise.reject(error), vi.fn(), new AbortController().signal)).rejects.toBe(
      error,
    );
  });
});
