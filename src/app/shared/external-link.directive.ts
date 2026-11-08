import { Directive, HostListener, inject, input } from '@angular/core';

import { PlatformService } from '../services/platform.service';

/** Open links in the system's browser. */
@Directive({
  selector: 'a[appExternal]',
  host: { '[attr.href]': 'appExternal()', target: '_blank', rel: 'noopener' },
})
export class ExternalLinkDirective {
  readonly appExternal = input.required<string>();

  private readonly platform = inject(PlatformService);

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.platform.openExternal(this.appExternal());
  }
}
