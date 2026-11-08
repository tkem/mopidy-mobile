import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Always start from the default route, so that views have proper back
// navigation and the app can (re)connect to the last server used.
if (location.hash.length > 2) {
  history.replaceState(null, '', location.pathname + location.search);
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
