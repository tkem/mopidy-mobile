import { Injectable, signal } from '@angular/core';

const DELAY = 100;

/** Reference-counted loading indicator, shown after a short delay. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly activeSignal = signal(false);

  readonly active = this.activeSignal.asReadonly();

  show(): void {
    if (this.count++ === 0) {
      this.timer = setTimeout(() => this.activeSignal.set(true), DELAY);
    }
  }

  hide(): void {
    if (this.count > 0 && --this.count === 0) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.activeSignal.set(false);
    }
  }
}
