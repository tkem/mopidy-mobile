import { Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { PlatformService } from '../services/platform.service';
import { TranslatePipe } from '../services/translate.service';
import { ExternalLinkDirective } from '../shared/external-link.directive';

interface License {
  name: string;
  url: string;
  copyright: string;
  license: string;
  licenseUrl: string;
  app?: boolean;
}

const APACHE2 = 'Apache License, Version 2.0';
const MIT = 'MIT License';

const LICENSES: License[] = [
  {
    name: 'Mopidy.js',
    url: 'https://github.com/mopidy/mopidy.js',
    copyright: 'Copyright © 2012-2020 Stein Magnus Jodal and contributors.',
    license: APACHE2,
    licenseUrl: 'https://github.com/mopidy/mopidy.js/blob/main/LICENSE',
  },
  {
    name: 'Ionic',
    url: 'https://ionicframework.com/',
    copyright: 'Copyright © 2015-present Ionic.',
    license: MIT,
    licenseUrl: 'https://github.com/ionic-team/ionic-framework/blob/main/LICENSE',
  },
  {
    name: 'Ionicons',
    url: 'https://ionic.io/ionicons',
    copyright: 'Copyright © 2015-present Ionic.',
    license: MIT,
    licenseUrl: 'https://github.com/ionic-team/ionicons/blob/main/LICENSE',
  },
  {
    name: 'Angular',
    url: 'https://angular.dev/',
    copyright: 'Copyright © 2010-2025 Google LLC.',
    license: MIT,
    licenseUrl: 'https://github.com/angular/angular/blob/main/LICENSE',
  },
  {
    name: 'RxJS',
    url: 'https://rxjs.dev/',
    copyright: 'Copyright © 2015-2018 Google, Inc., Netflix, Inc., Microsoft Corp. and contributors.',
    license: APACHE2,
    licenseUrl: 'https://github.com/ReactiveX/rxjs/blob/master/LICENSE.txt',
  },
  {
    name: 'messageformat',
    url: 'https://messageformat.github.io/',
    copyright: 'Copyright © OpenJS Foundation and contributors.',
    license: MIT,
    licenseUrl: 'https://github.com/messageformat/messageformat/blob/main/LICENSE',
  },
  {
    name: 'Apache Cordova',
    url: 'https://cordova.apache.org/',
    copyright: 'Copyright © 2012-2025 The Apache Software Foundation.',
    license: APACHE2,
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    app: true,
  },
  {
    name: 'PhoneGap Social Sharing Plugin',
    url: 'https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin',
    copyright: 'Copyright © 2014-2016 Eddy Verbruggen.',
    license: MIT,
    licenseUrl: 'https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin/blob/master/LICENSE',
    app: true,
  },
  {
    name: 'Cordova Music Controls Plugin',
    url: 'https://github.com/ghenry22/cordova-plugin-music-controls2',
    copyright: 'Copyright © 2015 HomerOurs.',
    license: MIT,
    licenseUrl: 'https://github.com/ghenry22/cordova-plugin-music-controls2/blob/master/LICENSE',
    app: true,
  },
  {
    name: 'Cordova ZeroConf Plugin',
    url: 'https://github.com/becvert/cordova-plugin-zeroconf',
    copyright: 'Copyright © 2015 becvert.',
    license: MIT,
    licenseUrl: 'https://github.com/becvert/cordova-plugin-zeroconf/blob/master/LICENSE',
    app: true,
  },
];

@Component({
  selector: 'app-settings-licenses',
  imports: [
    ExternalLinkDirective,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
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
        <ion-title>{{ 'Licenses' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (item of licenses; track item.name) {
          @if (!item.app || isWebView) {
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h2><a [appExternal]="item.url">{{ item.name }}</a></h2>
                <p>{{ item.copyright }}</p>
                <p><a [appExternal]="item.licenseUrl">{{ item.license }}</a></p>
              </ion-label>
            </ion-item>
          }
        }
      </ion-list>
    </ion-content>
  `,
})
export class LicensesPage {
  readonly licenses = LICENSES;
  readonly isWebView = inject(PlatformService).isWebView();
}
