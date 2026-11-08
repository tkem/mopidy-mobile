import { Injectable, NgZone, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { Observable, Subject, filter, map } from 'rxjs';

import { LoadingService } from './loading.service';
import { LoggingService, reportedErrors } from './logging.service';
import { MopidyApi, MopidyFactory, MopidySettings } from './mopidy.service';
import { TranslateService } from './translate.service';

export class TimeoutError extends Error {
  override name = 'TimeoutError';
}

interface ConnectionEvent {
  name: string;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function withTimeout<T>(promise: Promise<T>, timeout: number | null): Promise<T> {
  if (!timeout) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), timeout);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * The connection to the current Mopidy server.
 *
 * Requests made via `call()` show a loading indicator, and let the
 * user retry or ignore requests that failed.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  /** Connection timeout in ms, or null for no timeout. */
  connectionTimeout: number | null = null;

  /** Request timeout in ms, or null for no timeout. */
  requestTimeout: number | null = null;

  private readonly alerts = inject(AlertController);
  private readonly factory = inject(MopidyFactory);
  private readonly loading = inject(LoadingService);
  private readonly logging = inject(LoggingService);
  private readonly translate = inject(TranslateService);
  private readonly zone = inject(NgZone);

  private readonly events = new Subject<ConnectionEvent>();
  private readonly settings: MopidySettings = { backoffDelayMax: 2000, backoffDelayMin: 500 };
  private promise: Promise<MopidyApi> | null = null;
  private retries = 0;

  private readonly notify = (name: string, data?: unknown) => {
    switch (name) {
      case 'state:online':
        this.logging.info('Mopidy connection online');
        break;
      case 'state:offline':
        this.logging.warn('Mopidy connection offline');
        break;
    }
    this.zone.run(() => this.events.next({ name, data }));
  };

  /**
   * Observe connection state changes (e.g. "state:online") and Mopidy
   * events (e.g. "event:tracklistChanged").
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on<T = any>(name: string): Observable<T> {
    return this.events.pipe(
      filter((event) => event.name === name),
      map((event) => event.data as T),
    );
  }

  /** Get the current connection, connecting if necessary. */
  get(): Promise<MopidyApi> {
    if (!this.promise) {
      this.promise = this.connect();
    }
    return this.promise;
  }

  /** Perform a request, handling errors and timeouts. */
  async call<T>(fn: (mopidy: MopidyApi) => T | Promise<T>): Promise<T> {
    try {
      const mopidy = await this.get();
      this.loading.show();
      try {
        return await withTimeout(Promise.resolve().then(() => fn(mopidy)), this.requestTimeout);
      } finally {
        this.loading.hide();
      }
    } catch (error) {
      return this.handleError(error, fn);
    }
  }

  close(): void {
    if (this.promise) {
      this.promise.then(
        (mopidy) => {
          mopidy.close();
          mopidy.removeAllListeners();
        },
        () => undefined,
      );
      this.promise = null;
    }
  }

  /** Reconnect, optionally to a new server or using an existing client. */
  reset(webSocketUrl?: string | null, mopidy?: MopidyApi): Promise<MopidyApi> {
    const replaced = !!this.promise;
    this.close();
    if (webSocketUrl) {
      this.settings.webSocketUrl = webSocketUrl;
    }
    if (mopidy) {
      this.subscribe(mopidy);
      this.promise = Promise.resolve(mopidy);
    }
    return this.get().then(
      (mopidy) => {
        if (replaced) {
          // the new client is already online, so tell observers holding
          // state of the previous connection to reload
          this.events.next({ name: 'state:online', data: undefined });
        }
        return mopidy;
      },
      (error) => this.handleError(error),
    );
  }

  getSettings(): MopidySettings {
    return { ...this.settings };
  }

  private connect(): Promise<MopidyApi> {
    this.loading.show();
    return this.factory
      .create(this.settings, this.connectionTimeout)
      .then((mopidy) => {
        this.subscribe(mopidy);
        return mopidy;
      })
      .finally(() => this.loading.hide());
  }

  private subscribe(mopidy: MopidyApi): void {
    mopidy.on('state', this.notify);
    mopidy.on('event', this.notify);
  }

  private async handleError<T>(error: unknown, fn?: (mopidy: MopidyApi) => T | Promise<T>): Promise<T> {
    const err = (error || {}) as { name?: string; message?: string; data?: { message?: string } };
    if (err.name && err.message) {
      this.logging.error(err.name + ': ' + err.message, error);
    } else {
      this.logging.error(err.name || 'Error', error);
    }
    const retry = await this.confirmRetry(err);
    if (!retry) {
      this.retries = 0;
      if (error instanceof Object) {
        reportedErrors.add(error);
      }
      throw error;
    }
    if (fn) {
      if (++this.retries % 2 === 0) {
        this.close();
      }
      const result = await this.call(fn);
      this.retries = 0;
      return result;
    } else {
      return this.reset();
    }
  }

  private async confirmRetry(error: { name?: string; message?: string; data?: { message?: string } }) {
    const alert = await this.alerts.create({
      header: this.translate.instant(error.name || 'Error'),
      subHeader: error.message || undefined,
      message: error.data?.message || undefined,
      cssClass: 'app-error-alert',
      backdropDismiss: false,
      buttons: [
        { text: this.translate.instant('Ignore'), role: 'cancel' },
        { text: this.translate.instant('Retry'), role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }
}
