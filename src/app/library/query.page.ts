import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '../services/translate.service';

interface Term {
  key: string;
  value: string;
}

const FIELDS: [string, string][] = [
  ['any', 'Any'],
  ['album', 'Album'],
  ['albumartist', 'Album artist'],
  ['artist', 'Artist'],
  ['comment', 'Comment'],
  ['composer', 'Composer'],
  ['date', 'Date'],
  ['genre', 'Genre'],
  ['performer', 'Performer'],
  ['track_name', 'Track'],
];

@Component({
  selector: 'app-library-query',
  imports: [
    FormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/library" [text]="'Back' | translate" />
        </ion-buttons>
        <ion-title>{{ 'Search {name}' | translate: { name: name || ('Library' | translate) } }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form (ngSubmit)="submit()">
        <ion-list>
          @for (term of terms; track term; let i = $index; let last = $last) {
            <ion-item>
              <ion-select
                slot="start"
                class="field"
                interface="popover"
                aria-label="Field"
                [name]="'key' + i"
                [(ngModel)]="term.key"
              >
                @for (field of fields; track field[0]) {
                  <ion-select-option [value]="field[0]">{{ field[1] | translate }}</ion-select-option>
                }
              </ion-select>
              <ion-input
                aria-label="Search term"
                [name]="'value' + i"
                [(ngModel)]="term.value"
                [placeholder]="'Search term' | translate"
                (ionInput)="update()"
              />
              @if (!last) {
                <ion-button slot="end" fill="clear" color="medium" (click)="remove(i)">
                  <ion-icon slot="icon-only" name="close" />
                </ion-button>
              }
            </ion-item>
          }
          <ion-item>
            <ion-toggle name="exact" [(ngModel)]="exact">{{ 'Find exact' | translate }}</ion-toggle>
          </ion-item>
        </ion-list>
        <ion-button class="ion-margin" expand="block" type="submit" [disabled]="!valid()">
          {{ 'Search' | translate }}
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: `
    ion-select.field {
      max-width: 40%;
    }
  `,
})
export class QueryPage implements OnInit {
  readonly fields = FIELDS;

  private readonly nav = inject(NavController);
  private readonly route = inject(ActivatedRoute);

  terms: Term[] = [{ key: 'any', value: '' }];
  exact = false;
  uri: string | null = null;
  name: string | null = null;

  ngOnInit(): void {
    this.uri = this.route.snapshot.queryParamMap.get('uri');
    this.name = this.route.snapshot.queryParamMap.get('name');
  }

  /** Always keep an empty term at the end. */
  update(): void {
    if (this.terms[this.terms.length - 1].value) {
      this.terms.push({ key: 'any', value: '' });
    }
  }

  remove(index: number): void {
    this.terms.splice(index, 1);
  }

  valid(): boolean {
    return !!this.terms[0].value && this.terms.slice(0, -1).every((term) => term.value);
  }

  submit(): void {
    if (!this.valid()) {
      return;
    }
    const params: Record<string, string[] | string> = {};
    for (const term of this.terms) {
      if (term.value) {
        params[term.key] = [...((params[term.key] as string[]) || []), term.value];
      }
    }
    if (this.uri) {
      params['uris'] = [this.uri];
    }
    params['exact'] = String(this.exact);
    this.nav.navigateForward(['/library/search'], { queryParams: params });
  }
}
