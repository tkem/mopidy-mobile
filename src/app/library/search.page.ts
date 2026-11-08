import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  NavController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { Image, Model, SearchResult } from '../models';
import { ActionsService } from '../services/actions.service';
import { ConnectionService } from '../services/connection.service';
import { DetailsService } from '../services/details.service';
import { LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe } from '../shared/pipes';
import { ThumbnailComponent } from '../shared/thumbnail.component';

const QUERY_FIELDS = [
  'album',
  'albumartist',
  'any',
  'artist',
  'comment',
  'composer',
  'date',
  'genre',
  'performer',
  'track_name',
];

function compareByName(a: Model, b: Model): number {
  return (a.name || '').localeCompare(b.name || '');
}

function mergeResults(results: SearchResult[]): Required<SearchResult> {
  if (results.length === 1) {
    // single result - keep order
    return {
      artists: results[0].artists || [],
      albums: results[0].albums || [],
      tracks: results[0].tracks || [],
    };
  } else {
    // multiple results - merge and sort by name
    return {
      artists: results.flatMap((result) => result.artists || []).sort(compareByName),
      albums: results.flatMap((result) => result.albums || []).sort(compareByName),
      tracks: results.flatMap((result) => result.tracks || []).sort(compareByName),
    };
  }
}

@Component({
  selector: 'app-library-search',
  imports: [
    ArtistsPipe,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRefresher,
    IonRefresherContent,
    IonTitle,
    IonToolbar,
    ThumbnailComponent,
    TranslatePipe,
  ],
  templateUrl: './search.page.html',
})
export class SearchPage implements OnInit {
  readonly actions = inject(ActionsService);
  readonly menu = inject(MenuService);

  private readonly connection = inject(ConnectionService);
  private readonly details = inject(DetailsService);
  private readonly logging = inject(LoggingService);
  private readonly nav = inject(NavController);
  private readonly route = inject(ActivatedRoute);

  readonly artists = signal<Model[]>([]);
  readonly albums = signal<Model[]>([]);
  readonly tracks = signal<Model[]>([]);
  readonly images = signal<Record<string, Image | null>>({});

  private query: Record<string, string[]> = {};
  private uris: string[] | null = null;
  private exact = false;
  private abort: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.abort?.abort());
    this.connection
      .on('state:online')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    for (const key of QUERY_FIELDS) {
      const values = params.getAll(key);
      if (values.length) {
        this.query[key] = values;
      }
    }
    const uris = params.getAll('uris');
    this.uris = uris.length ? uris : null;
    this.exact = params.get('exact') === 'true';
    this.connection
      .call((mopidy) => mopidy.library.search({ query: this.query, uris: this.uris, exact: this.exact }))
      .then((results) => this.setResults(results))
      .catch((error) => this.logging.warn('Error searching library', error));
  }

  lookup(model: Model): void {
    this.nav.navigateForward(['/library/lookup', model.uri], { queryParams: { name: model.name } });
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      await mopidy.library.refresh({ uri: this.uris?.length === 1 ? this.uris[0] : null });
      await this.reload();
    } catch (error) {
      this.logging.warn('Error refreshing library', error);
    } finally {
      event.target.complete();
    }
  }

  async reload(): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      this.setResults(await mopidy.library.search({ query: this.query, uris: this.uris, exact: this.exact }));
    } catch (error) {
      this.logging.warn('Error searching library', error);
    }
  }

  private setResults(results: SearchResult[]): void {
    const merged = mergeResults(results);
    this.artists.set(merged.artists);
    this.albums.set(merged.albums);
    this.tracks.set(merged.tracks);
    this.abort?.abort();
    this.abort = new AbortController();
    const images = this.images();
    this.details.load(
      [...merged.artists, ...merged.albums, ...merged.tracks].filter((model) => !(model.uri in images)),
      { images: (images) => this.images.update((obj) => ({ ...obj, ...images })) },
      this.abort.signal,
    );
  }
}
