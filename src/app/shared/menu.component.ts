import { Component, Input, inject } from '@angular/core';
import {
  CheckboxCustomEvent,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonList,
  PopoverController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '../services/translate.service';

export interface MenuItem {
  /** Message key, translated when displayed. */
  text: string;
  /** Whether selecting the item opens a dialog. */
  hellip?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  /** Called after the menu is closed. */
  handler?: () => unknown;
  /** For checkbox items: the current state and change handler. */
  checked?: boolean;
  toggle?: (checked: boolean) => unknown;
}

/** A popover menu. */
@Component({
  selector: 'app-menu',
  imports: [IonCheckbox, IonItem, IonLabel, IonList, TranslatePipe],
  template: `
    <ion-list lines="none">
      @for (item of items; track $index) {
        @if (!item.hidden) {
          @if (item.toggle) {
            <ion-item>
              <ion-checkbox justify="space-between" [checked]="!!item.checked" (ionChange)="toggle(item, $event)">
                {{ item.text | translate }}
              </ion-checkbox>
            </ion-item>
          } @else {
            <ion-item button [detail]="false" [disabled]="!!item.disabled" (click)="select(item)">
              <ion-label>{{ item.text | translate }}{{ item.hellip ? '…' : '' }}</ion-label>
            </ion-item>
          }
        }
      }
    </ion-list>
  `,
})
export class MenuComponent {
  @Input() items: MenuItem[] = [];

  private readonly popoverController = inject(PopoverController);

  select(item: MenuItem): void {
    this.popoverController.dismiss().then(() => item.handler?.());
  }

  toggle(item: MenuItem, event: Event): void {
    item.checked = (event as CheckboxCustomEvent).detail.checked;
    item.toggle?.(item.checked);
  }
}
