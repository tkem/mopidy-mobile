/** Mopidy models, as returned by the Mopidy JSON-RPC API. */

export interface Artist {
  __model__?: string;
  name?: string;
  uri?: string;
  musicbrainz_id?: string;
}

export interface Album {
  __model__?: string;
  name?: string;
  uri?: string;
  artists?: Artist[];
  date?: string;
  musicbrainz_id?: string;
  images?: string[];
}

/**
 * A generic Mopidy model, i.e. a Ref, Track, Album or Artist.
 *
 * Library refs are often extended with the corresponding track
 * information, so most track properties are optional.
 */
export interface Model {
  __model__?: string;
  uri: string;
  name?: string;
  type?: string;
  artists?: Artist[];
  album?: Album;
  composers?: Artist[];
  performers?: Artist[];
  genre?: string;
  track_no?: number;
  disc_no?: number;
  date?: string;
  length?: number;
  bitrate?: number;
  comment?: string;
  musicbrainz_id?: string;
}

export type Ref = Model;
export type Track = Model;

export interface TlTrack {
  tlid: number;
  track: Track;
}

export interface Image {
  uri: string;
  width?: number;
  height?: number;
}

export interface TracklistOptions {
  consume?: boolean;
  random?: boolean;
  repeat?: boolean;
  single?: boolean;
}

export interface SearchResult {
  artists?: Model[];
  albums?: Model[];
  tracks?: Model[];
}
