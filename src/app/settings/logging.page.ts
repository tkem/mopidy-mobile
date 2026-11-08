import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { LOG_ICONS } from '../icons';
import { LogRecord, LoggingService } from '../services/logging.service';
import { MenuService } from '../services/menu.service';
import { PlatformService } from '../services/platform.service';
import { PreferencesService } from '../services/preferences.service';
import { TranslatePipe } from '../services/translate.service';

function stringify(obj: unknown): string {
  if (obj instanceof Error) {
    return obj.stack || `${obj.name}: ${obj.message}`;
  }
  try {
    const json = JSON.stringify(obj);
    return json === undefined || json === '{}' ? String(obj) : json;
  } catch {
    return String(obj);
  }
}

@Component({
  selector: 'app-settings-logging',
  imports: [
    DatePipe,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings" [text]="'Back' | translate" />
        </ion-buttons>
        <ion-title>{{ 'Logging' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showMenu($event)">
            <ion-icon slot="icon-only" name="ellipsis-vertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (record of logging.records(); track record) {
          <ion-item button [detail]="false" (click)="toggle(record)">
            <ion-icon slot="start" [name]="icon(record.level)" [color]="color(record.level)" />
            <ion-label [class.ion-text-wrap]="expanded().has(record)">
              <span class="time">{{ record.time | date: 'HH:mm:ss.SSS' }}:</span>
              @for (arg of record.args; track $index) {
                {{ expanded().has(record) ? stringify(arg) : arg }}
              }
            </ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: `
    ion-label {
      font-family: monospace;
      font-size: 12px;
    }
    .time {
      color: var(--ion-color-medium);
    }
  `,
})
export class LoggingPage {
  readonly logging = inject(LoggingService);
  readonly expanded = signal(new Set<LogRecord>());
  readonly stringify = stringify;

  private readonly menu = inject(MenuService);
  private readonly platform = inject(PlatformService);
  private readonly preferences = inject(PreferencesService);

  icon(level: string): string {
    return LOG_ICONS[level] || 'information-circle';
  }

  color(level: string): string | undefined {
    return level === 'error' ? 'danger' : level === 'warn' ? 'warning' : undefined;
  }

  toggle(record: LogRecord): void {
    this.expanded.update((set) => {
      const result = new Set(set);
      if (!result.delete(record)) {
        result.add(record);
      }
      return result;
    });
  }

  showMenu(event: Event): void {
    this.menu.show(event, [
      {
        text: 'Debug messages',
        checked: this.logging.debugEnabled,
        toggle: (checked) => this.preferences.setDebug(checked),
      },
      { text: 'Share', hellip: true, hidden: !this.platform.canShare(), handler: () => this.share() },
      { text: 'Clear', handler: () => this.logging.clear() },
    ]);
  }

  async share(): Promise<void> {
    const subject = 'Mopidy Mobile ' + this.platform.version();
    const message = this.logging
      .records()
      .map((record) => [record.level, record.time, record.args.map(stringify).join(' ')].join('\t'))
      .join('\n');
    try {
      const result = await this.platform.share(subject, message);
      this.logging.debug('Sharing log returned', result);
    } catch (error) {
      this.logging.error('Error sharing log:', error);
    }
  }
}
