import { describe, expect, it } from 'vitest';

import { ArtistsPipe, DurationPipe, SchemePipe } from './pipes';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('formats milliseconds as m:ss', () => {
    expect(pipe.transform(0)).toBe('0:00');
    expect(pipe.transform(1000)).toBe('0:01');
    expect(pipe.transform(59000)).toBe('0:59');
    expect(pipe.transform(60000)).toBe('1:00');
    expect(pipe.transform(3599000)).toBe('59:59');
    expect(pipe.transform(3600000)).toBe('60:00');
  });

  it('rounds to the nearest second', () => {
    expect(pipe.transform(1499)).toBe('0:01');
    expect(pipe.transform(1500)).toBe('0:02');
  });

  it('returns n/a for missing values', () => {
    expect(pipe.transform(null)).toBe('n/a');
    expect(pipe.transform(undefined)).toBe('n/a');
  });
});

describe('ArtistsPipe', () => {
  const pipe = new ArtistsPipe();

  it('joins artist names', () => {
    expect(pipe.transform([{ name: 'A' }, { name: 'B' }])).toBe('A · B');
  });

  it('falls back to the URI for unnamed artists', () => {
    expect(pipe.transform([{ uri: 'local:artist:1' }, { name: 'B' }])).toBe('local:artist:1 · B');
  });

  it('returns an empty string for missing values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform([])).toBe('');
  });
});

describe('SchemePipe', () => {
  const pipe = new SchemePipe();

  it('returns the URI scheme', () => {
    expect(pipe.transform('local:playlist:foo')).toBe('local');
    expect(pipe.transform('m3u:bar')).toBe('m3u');
  });

  it('returns an empty string for missing values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
});
