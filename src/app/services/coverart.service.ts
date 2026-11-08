import { Injectable, inject } from '@angular/core';

import { Image, Model } from '../models';
import { ConnectionService } from './connection.service';
import { LoggingService } from './logging.service';

/** A cover art provider, mapping model URIs to available images. */
type CoverartProvider = (models: Model[]) => Promise<Record<string, Image[]>>;

export interface ImageSize {
  width?: number;
  height?: number;
}

function imageCompare(a: Image, b: Image): number {
  return (a.width || Infinity) - (b.width || Infinity) || (a.height || Infinity) - (b.height || Infinity);
}

function findImage(images: Image[] | undefined, width?: number, height?: number): Image | null {
  if (!images || !images.length) {
    return null;
  }
  for (const image of images) {
    if (image.width === undefined || image.height === undefined) {
      return image;
    } else if (image.width >= (width ?? 0) && image.height >= (height ?? 0)) {
      return image;
    }
  }
  return images[images.length - 1];
}

/** Resolve all promises in an object, with failed promises mapped to []. */
async function allSettled<T>(promises: Record<string, Promise<T[]>>): Promise<Record<string, T[]>> {
  const keys = Object.keys(promises);
  const values = await Promise.all(keys.map((key) => promises[key].catch(() => [] as T[])));
  const result: Record<string, T[]> = {};
  keys.forEach((key, index) => (result[key] = values[index]));
  return result;
}

// see https://github.com/mopidy/mopidy/issues/1486
function isNotStream(uri: string): boolean {
  const scheme = uri.split(':', 2)[0];
  return !['file', 'http', 'https', 'mms', 'rtmp', 'rtmps', 'rtsp'].includes(scheme);
}

/** Cover art from the Mopidy server's library.get_images(). */
@Injectable({ providedIn: 'root' })
export class MopidyCoverart {
  private readonly connection = inject(ConnectionService);

  readonly getImages: CoverartProvider = async (models) => {
    const uris = models.map((model) => model.uri).filter(isNotStream);
    if (!uris.length) {
      return {};
    }
    // resolve absolute path URIs, as returned by Mopidy-Local
    const url = this.connection.getSettings().webSocketUrl;
    const match = url ? /^ws(s?):\/\/([^/]+)/.exec(url) : null;
    const resolve = (image: Image): Image =>
      match && image.uri.charAt(0) === '/' ? { ...image, uri: `http${match[1]}://${match[2]}${image.uri}` } : image;
    const mopidy = await this.connection.get();
    const result: Record<string, Image[] | null> = await mopidy.library.getImages({ uris });
    const images: Record<string, Image[]> = {};
    for (const [uri, value] of Object.entries(result)) {
      images[uri] = value ? value.map(resolve) : [];
    }
    return images;
  };
}

const LASTFM_URL = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_API_KEY = 'fd01fd0378426f85397626d5f8bcc692';
const LASTFM_SIZES: Record<string, number | undefined> = {
  small: 34,
  medium: 64,
  large: 126,
  extralarge: 252,
  mega: undefined,
};

function lastfmParams(model: Model): Record<string, string> | undefined {
  const album = model.album;
  switch (model.__model__) {
    case 'Album':
      if (model.musicbrainz_id) {
        return { method: 'album.getInfo', mbid: model.musicbrainz_id };
      } else if (model.name && model.artists?.length && model.artists[0].name) {
        return { method: 'album.getInfo', album: model.name, artist: model.artists[0].name };
      }
      return undefined;
    case 'Artist':
      if (model.musicbrainz_id) {
        return { method: 'artist.getInfo', mbid: model.musicbrainz_id };
      } else if (model.name) {
        return { method: 'artist.getInfo', artist: model.name };
      }
      return undefined;
    case 'Track':
      if (album?.musicbrainz_id) {
        return { method: 'album.getInfo', mbid: album.musicbrainz_id };
      } else if (album?.name && album.artists?.length && album.artists[0].name) {
        return { method: 'album.getInfo', album: album.name, artist: album.artists[0].name };
      } else if (album?.name && model.artists?.length && model.artists[0].name) {
        return { method: 'album.getInfo', album: album.name, artist: model.artists[0].name };
      } else if (model.musicbrainz_id) {
        return { method: 'track.getInfo', mbid: model.musicbrainz_id };
      } else if (model.name && model.artists?.length && model.artists[0].name) {
        return { method: 'track.getInfo', track: model.name, artist: model.artists[0].name };
      }
      return undefined;
    default:
      return undefined;
  }
}

interface LastfmImage {
  '#text': string;
  size: string;
}

/** Cover art from last.fm. */
@Injectable({ providedIn: 'root' })
export class LastfmCoverart {
  readonly getImages: CoverartProvider = (models) => {
    const images: Record<string, Promise<Image[]>> = {};
    const promises: Record<string, Promise<Image[]>> = {};
    for (const model of models) {
      const params = lastfmParams(model);
      if (params) {
        const key = JSON.stringify(params);
        images[model.uri] = promises[key] ??= this.fetchImages(params);
      }
    }
    return allSettled(images);
  };

  private async fetchImages(params: Record<string, string>): Promise<Image[]> {
    const query = new URLSearchParams({ ...params, format: 'json', api_key: LASTFM_API_KEY });
    const response = await fetch(`${LASTFM_URL}?${query}`);
    if (!response.ok) {
      throw new Error(`last.fm request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const images: LastfmImage[] =
      data.album?.image || data.artist?.image || data.track?.image || data.track?.album?.image || [];
    // last.fm returns empty URIs for podcasts, for example
    return images
      .filter((image) => image['#text'])
      .map((image) => ({
        uri: image['#text'],
        width: LASTFM_SIZES[image.size],
        height: LASTFM_SIZES[image.size],
      }));
  }
}

const ARCHIVE_URL = 'https://coverartarchive.org/release/';

/** Cover art from the Cover Art Archive. */
@Injectable({ providedIn: 'root' })
export class ArchiveCoverart {
  readonly getImages: CoverartProvider = (models) => {
    const images: Record<string, Promise<Image[]>> = {};
    const promises: Record<string, Promise<Image[]>> = {};
    for (const model of models) {
      const mbid =
        model.__model__ === 'Album'
          ? model.musicbrainz_id
          : model.__model__ === 'Track'
            ? model.album?.musicbrainz_id
            : undefined;
      if (mbid) {
        images[model.uri] = promises[mbid] ??= this.fetchImages(mbid);
      }
    }
    return allSettled(images);
  };

  private async fetchImages(mbid: string): Promise<Image[]> {
    const uri = ARCHIVE_URL + mbid + '/front';
    const image = await new Promise<Image>((resolve, reject) => {
      const img = new window.Image();
      img.onabort = img.onerror = (error) => reject(error);
      img.onload = () => resolve({ uri, width: img.width, height: img.height });
      img.src = uri;
    });
    return [
      image,
      { uri: uri + '-250', width: 250, height: 250 },
      { uri: uri + '-500', width: 500, height: 500 },
    ];
  }
}

/** Cover art from the enabled providers, with a simple LRU cache. */
@Injectable({ providedIn: 'root' })
export class CoverartService {
  maxCache = 1000;

  private readonly logging = inject(LoggingService);
  private readonly providers: Record<string, CoverartProvider> = {
    archive: inject(ArchiveCoverart).getImages,
    lastfm: inject(LastfmCoverart).getImages,
    mopidy: inject(MopidyCoverart).getImages,
  };
  private readonly cache = new Map<string, Image[]>();
  private services: CoverartProvider[] = [];

  clearCache(): void {
    this.cache.clear();
  }

  async getImages(models: Model[], size?: ImageSize): Promise<Record<string, Image | null>> {
    const result: Record<string, Image | null> = {};
    const params: Model[] = [];
    for (const model of models) {
      const images = this.cache.get(model.uri);
      if (images) {
        // move to end of LRU order
        this.cache.delete(model.uri);
        this.cache.set(model.uri, images);
        result[model.uri] = findImage(images, size?.width, size?.height);
      } else {
        params.push(model);
      }
    }
    if (params.length) {
      const results = await Promise.all(
        this.services.map((service) =>
          service(params).catch((error) => {
            this.logging.error('Error loading cover art', error);
            return {} as Record<string, Image[]>;
          }),
        ),
      );
      const merged: Record<string, Image[]> = {};
      for (const obj of results) {
        for (const [uri, images] of Object.entries(obj)) {
          merged[uri] = (merged[uri] || []).concat(images || []);
        }
      }
      for (const [uri, images] of Object.entries(merged)) {
        images.sort(imageCompare);
        this.put(uri, images);
        result[uri] = findImage(images, size?.width, size?.height);
      }
    }
    return result;
  }

  async getImage(model: Model, size?: ImageSize): Promise<Image | null> {
    const result = await this.getImages([model], size);
    return result[model.uri] ?? null;
  }

  /** Select the cover art providers to use. */
  use(names: string[]): void {
    this.services = [];
    for (const name of names) {
      const provider = this.providers[name];
      if (provider) {
        this.services.push(provider);
      } else {
        this.logging.error('Invalid coverart service ' + name);
      }
    }
  }

  private put(uri: string, images: Image[]): void {
    this.cache.set(uri, images);
    while (this.cache.size > this.maxCache) {
      this.cache.delete(this.cache.keys().next().value as string);
    }
  }
}
