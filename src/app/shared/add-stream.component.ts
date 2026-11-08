import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '../services/translate.service';

export interface Stream {
  name: string;
  uri: string;
}

/** Enter a stream URL (and name); dismissed with the new stream. */
@Component({
  selector: 'app-add-stream',
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonTitle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="start" name="close" />
            {{ 'Cancel' | translate }}
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'Add stream' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form #form="ngForm" (ngSubmit)="submit()">
        <ion-list>
          @if (withName) {
            <ion-item>
              <ion-input
                name="name"
                [(ngModel)]="name"
                [label]="'Name' | translate"
                labelPlacement="stacked"
                placeholder="Radio Stream"
                required
              />
            </ion-item>
          }
          <ion-item>
            <ion-input
              name="uri"
              type="text"
              [(ngModel)]="uri"
              [label]="'URL' | translate"
              labelPlacement="stacked"
              placeholder="http://example.com/stream.mp3"
              required
            />
          </ion-item>
        </ion-list>
        <ion-button class="ion-margin" expand="block" type="submit" [disabled]="!!form.invalid">
          {{ 'Add stream' | translate }}
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class AddStreamComponent {
  @Input() withName = false;

  name = '';
  uri = '';

  private readonly modalController = inject(ModalController);

  cancel(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  submit(): void {
    this.modalController.dismiss({ name: this.name, uri: this.uri } satisfies Stream, 'confirm');
  }
}
