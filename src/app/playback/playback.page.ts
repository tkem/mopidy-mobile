import { Component, OnInit, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonRange,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
  RangeCustomEvent,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { MenuService } from '../services/menu.service';
import { MixerService, PlaybackService } from '../services/playback.service';
import { TranslatePipe } from '../services/translate.service';
import { ArtistsPipe, DurationPipe } from '../shared/pipes';

@Component({
  selector: 'app-playback',
  imports: [
    ArtistsPipe,
    DurationPipe,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonRange,
    IonRefresher,
    IonRefresherContent,
    IonToolbar,
    TranslatePipe,
  ],
  templateUrl: './playback.page.html',
  styleUrl: './playback.page.scss',
})
export class PlaybackPage implements OnInit {
  readonly playback = inject(PlaybackService);
  readonly mixer = inject(MixerService);

  private readonly menu = inject(MenuService);

  ngOnInit(): void {
    this.playback.start();
    this.mixer.start();
  }

  refresh(event: RefresherCustomEvent): void {
    Promise.all([this.playback.reload(), this.mixer.reload()]).finally(() => event.target.complete());
  }

  showMenu(event: Event): void {
    this.menu.trackInfo(event, this.playback.track());
  }

  setVolume(event: RangeCustomEvent): void {
    this.mixer.setVolume(event.detail.value as number);
  }

  seek(event: RangeCustomEvent): void {
    this.playback.seek(event.detail.value as number);
  }
}
