import { Component, inject } from '@angular/core';
import { IonButton, IonIcon, IonItem, IonLabel, IonList, PopoverController } from '@ionic/angular/standalone';

import { TracklistService } from '../services/tracklist.service';
import { TranslatePipe } from '../services/translate.service';

/** Tracklist options and actions. */
@Component({
  selector: 'app-tracklist-menu',
  imports: [IonButton, IonIcon, IonItem, IonLabel, IonList, TranslatePipe],
  template: `
    <ion-list lines="none">
      <ion-item>
        <div class="options">
          <ion-button
            fill="clear"
            [color]="tracklist.options().consume ? 'primary' : 'medium'"
            [attr.aria-label]="'Consume mode' | translate"
            (click)="tracklist.toggleConsume()"
          >
            <svg slot="icon-only" viewBox="0 0 64 64" aria-hidden="true">
              <path
                d="M 35.623047 9.5019531 A 22.5 22.5 0 0 0 19.384766 16.089844 A 22.5 22.5 0 0 0 19.384766 47.910156 A 22.5 22.5 0 0 0 51.205078 47.910156 L 35.294922 32 L 51.205078 16.089844 A 22.5 22.5 0 0 0 35.623047 9.5019531 z M 32 18.955078 A 2.5 2.5 0 0 1 34.5 21.455078 A 2.5 2.5 0 0 1 32 23.955078 A 2.5 2.5 0 0 1 29.5 21.455078 A 2.5 2.5 0 0 1 32 18.955078 z"
              />
            </svg>
          </ion-button>
          <ion-button fill="clear" [color]="tracklist.options().random ? 'primary' : 'medium'" (click)="tracklist.toggleRandom()">
            <ion-icon slot="icon-only" name="shuffle" />
          </ion-button>
          <ion-button fill="clear" [color]="tracklist.options().repeat ? 'primary' : 'medium'" (click)="tracklist.toggleRepeat()">
            <ion-icon slot="icon-only" name="repeat" />
          </ion-button>
          <ion-button fill="clear" [color]="tracklist.options().single ? 'primary' : 'medium'" (click)="tracklist.toggleSingle()">
            <ion-icon slot="icon-only" name="pin" />
          </ion-button>
        </div>
      </ion-item>
      <ion-item button [detail]="false" [disabled]="!tracklist.tlTracks().length" (click)="saveAs()">
        <ion-label>{{ 'Save as' | translate }}&hellip;</ion-label>
      </ion-item>
      <ion-item button [detail]="false" [disabled]="!tracklist.tlTracks().length" (click)="clear()">
        <ion-label>{{ 'Clear' | translate }}&hellip;</ion-label>
      </ion-item>
    </ion-list>
  `,
  styles: `
    .options {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
    svg {
      width: 1.6em;
      height: 1.6em;
      fill: currentColor;
    }
  `,
})
export class TracklistMenuComponent {
  readonly tracklist = inject(TracklistService);

  private readonly popoverController = inject(PopoverController);

  saveAs(): void {
    this.popoverController.dismiss().then(() => this.tracklist.saveAs());
  }

  clear(): void {
    this.popoverController.dismiss().then(() => this.tracklist.confirmClear());
  }
}

/** Show the tracklist menu. */
export async function showTracklistMenu(popovers: PopoverController, event: Event): Promise<void> {
  const popover = await popovers.create({ component: TracklistMenuComponent, cssClass: 'app-menu', event });
  await popover.present();
}
