import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonThumbnail } from '@ionic/angular/standalone';

import { Image } from '../models';

/** Thumbnail size, used for requesting cover art. */
export const THUMBNAIL_SIZE = { width: 64, height: 64 };

/** An item thumbnail, showing a placeholder if no image is available. */
@Component({
  selector: 'app-thumbnail',
  imports: [IonThumbnail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-thumbnail>
      @if (image()?.uri; as uri) {
        <img [src]="uri" alt="" loading="lazy" />
      } @else {
        <div class="placeholder" [class]="type()"></div>
      }
    </ion-thumbnail>
  `,
  styleUrl: './thumbnail.component.scss',
})
export class ThumbnailComponent {
  readonly image = input<Image | null | undefined>(null);
  readonly type = input<'album' | 'artist' | 'directory' | 'track'>('track');
}
