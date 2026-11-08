import { Pipe, PipeTransform } from '@angular/core';

import { Artist } from '../models';

/** Format a duration given in milliseconds as "m:ss". */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(ms: number | null | undefined): string {
    if (ms === undefined || ms === null) {
      return 'n/a';
    }
    const s = Math.round(ms / 1000);
    const sec = s % 60;
    const min = Math.floor(s / 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  }
}

/** Join artist names. */
@Pipe({ name: 'artists' })
export class ArtistsPipe implements PipeTransform {
  transform(artists: Artist[] | null | undefined): string {
    return (artists || []).map((artist) => artist.name || artist.uri).join(' · ');
  }
}

/** Get the URI scheme, e.g. "local" for "local:playlist:foo". */
@Pipe({ name: 'scheme' })
export class SchemePipe implements PipeTransform {
  transform(uri: string | null | undefined): string {
    return uri ? uri.substring(0, uri.indexOf(':')) : '';
  }
}
