import { ErrorHandler, Injectable, inject, signal } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

export interface LogRecord {
  time: number;
  level: LogLevel;
  args: unknown[];
}

/** Application logging, keeping recent messages for display. */
@Injectable({ providedIn: 'root' })
export class LoggingService {
  debugEnabled = false;
  maxBufferSize = 50;

  private buffer: LogRecord[] = [];
  private readonly recordsSignal = signal<LogRecord[]>([]);
  private pending = false;

  readonly records = this.recordsSignal.asReadonly();

  debug(...args: unknown[]): void {
    this.log('debug', args);
  }

  info(...args: unknown[]): void {
    this.log('info', args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', args);
  }

  error(...args: unknown[]): void {
    this.log('error', args);
  }

  clear(): void {
    this.buffer = [];
    this.recordsSignal.set([]);
  }

  log(level: LogLevel, args: unknown[]): void {
    console[level](...args);
    if (level !== 'debug' || this.debugEnabled) {
      this.buffer.push({ time: Date.now(), level, args });
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.splice(0, this.buffer.length - this.maxBufferSize);
      }
      // messages may be logged during change detection, so update the
      // records signal asynchronously
      if (!this.pending) {
        this.pending = true;
        queueMicrotask(() => {
          this.pending = false;
          this.recordsSignal.set([...this.buffer]);
        });
      }
    }
  }
}

/**
 * Errors that have already been reported to the user and logged, e.g.
 * connection errors the user chose to ignore.
 */
export const reportedErrors = new WeakSet<object>();

/** Global error handler adding uncaught errors to the application log. */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly logging = inject(LoggingService);

  handleError(error: unknown): void {
    const reason = (error as { rejection?: unknown })?.rejection ?? error;
    if (!(reason instanceof Object && reportedErrors.has(reason))) {
      this.logging.error('Uncaught error:', reason);
    }
  }
}
