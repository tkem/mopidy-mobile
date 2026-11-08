import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
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
  IonSearchbar,
  IonTitle,
  IonToolbar,
  NavController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { REF_ICONS } from '../icons';
import { Image, Ref, Track } from '../models';
import { ActionsService } from '../services/actions.service';
import { ConnectionService } from '../services/connection.service';
import { DetailsService } from '../services/details.service';
import { LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe } from '../shared/pipes';
import { ThumbnailComponent } from '../shared/thumbnail.component';

@Component({
  selector: 'app-library-browse',
  imports: [
    ArtistsPipe,
    FormsModule,
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
    IonSearchbar,
    IonTitle,
    IonToolbar,
    ThumbnailComponent,
    TranslatePipe,
  ],
  templateUrl: './browse.page.html',
})
export class BrowsePage implements OnInit {
  readonly actions = inject(ActionsService);
  readonly menu = inject(MenuService);

  private readonly connection = inject(ConnectionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly details = inject(DetailsService);
  private readonly logging = inject(LoggingService);
  private readonly nav = inject(NavController);
  private readonly route = inject(ActivatedRoute);

  readonly ref = signal<{ uri: string | null; name: string | null; type: string }>({
    uri: null,
    name: null,
    type: 'directory',
  });
  readonly items = signal<Ref[]>([]);
  readonly images = signal<Record<string, Image | null>>({});
  readonly tracks = computed(() => this.items().filter((item) => item.type === 'track'));

  q = '';

  private abort: AbortController | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.abort?.abort());
    this.connection
      .on('state:online')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    const query = this.route.snapshot.queryParamMap;
    this.ref.set({
      uri: params.get('uri'),
      name: query.get('name'),
      type: query.get('type') || 'directory',
    });
    this.connection
      .call((mopidy) => mopidy.library.browse({ uri: this.ref().uri }))
      .then((items) => this.setItems(items))
      .catch((error) => this.logging.warn('Error browsing library', error));
  }

  icon(type?: string): string {
    return REF_ICONS[type || 'directory'] || 'folder';
  }

  browse(item: Ref): void {
    this.nav.navigateForward(['/library/browse', item.uri], { queryParams: { name: item.name, type: item.type } });
  }

  query(): void {
    const { uri, name } = this.ref();
    this.nav.navigateForward(['/library/query'], { queryParams: { uri, name } });
  }

  search(): void {
    const uri = this.ref().uri;
    if (this.q) {
      this.nav.navigateForward(['/library/search'], { queryParams: { any: [this.q], uris: uri ? [uri] : null } });
    }
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    try {
      const mopidy = await this.connection.get();
      await mopidy.library.refresh({ uri: this.ref().uri });
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
      this.setItems(await mopidy.library.browse({ uri: this.ref().uri }));
    } catch (error) {
      this.logging.warn('Error browsing library', error);
    }
  }

  private setItems(items: Ref[]): void {
    this.items.set(items);
    this.abort?.abort();
    this.abort = new AbortController();
    this.details.load(
      items.filter((item) => item.type === 'track'),
      {
        tracks: (tracks: Record<string, Track>) =>
          this.items.update((items) => items.map((item) => tracks[item.uri] || item)),
        images: (images) => this.images.update((obj) => ({ ...obj, ...images })),
      },
      this.abort.signal,
    );
  }
}
