Mopidy Mobile
========================================================================

Mopidy Mobile is a Mopidy_ Web client extension for mobile devices,
and a `hybrid app`_ for Android version 4.4 and higher.  Users of
older Android versions may still access the Web extension using
Google's `Chrome browser`_.  On Apple devices, the Web client should
work with iOS 7 or higher.


Installation
------------------------------------------------------------------------

The Web extension can be installed using pip_ by running::

  pip install Mopidy-Mobile

The Android app is available from the `Google Play`_ store.

Note that the Web client is designed to be added to your home screen,
so it is launched in full-screen "app mode".  In fact, the only major
difference between the Web client and the hybrid app is that the app
will let you manage multiple Mopidy server instances.  Other than
that, they are functionally equivalent.  If you don't know how to add
a Web application to your home screen, there are plenty of
instructions available online for both Android_ and iOS_.


Configuration
------------------------------------------------------------------------

The following configuration values are available for the Web
extension:

- ``mobile/enabled``: Whether the Mopidy Mobile Web extension should
  be enabled.  Defaults to ``true``.

- ``mobile/title``: The Web application's title, which will also be
  displayed when added to your home screen.  The variables
  ``$hostname`` and ``$port`` can be used in the title.  Defaults to
  ``Mopidy Mobile on $hostname``.

- ``mobile/ws_url``: The WebSocket URL used to connect to your Mopidy
  server.  Set this if Mopidy's WebSocket is not available at its
  default path ``/mopidy/ws/``, for example when using a reverse
  proxy.


Building from Source
------------------------------------------------------------------------

Mopidy Mobile is built using Ionic_, AngularJS_ and `Apache Cordova`_,
and uses npm_ and gulp_ for its build system, so it is recommended to
familiarize yourself with these before you start.

To build the Mopidy Web extension, you need to have npm_ and gulp_
installed.  Then run::

  npm install
  gulp install
  gulp dist
  python setup.py develop

To build the hybrid app for Android, please follow Ionic's
`installation guide`_ to make sure you have everything needed for
Android development.  Then run::

  ionic resources android
  ionic platform add android
  cordova prepare
  ionic plugin add https://github.com/vstirbu/ZeroConf
  ionic build android


Project Resources
------------------------------------------------------------------------

.. image:: http://img.shields.io/pypi/v/Mopidy-Mobile.svg?style=flat
    :target: https://pypi.python.org/pypi/Mopidy-Mobile/
    :alt: Latest PyPI version

.. image:: http://img.shields.io/pypi/dm/Mopidy-Mobile.svg?style=flat
    :target: https://pypi.python.org/pypi/Mopidy-Mobile/
    :alt: Number of PyPI downloads

.. image:: http://img.shields.io/travis/tkem/mopidy-mobile/master.svg?style=flat
    :target: https://travis-ci.org/tkem/mopidy-mobile/
    :alt: Travis CI build status

.. image:: http://img.shields.io/coveralls/tkem/mopidy-mobile/master.svg?style=flat
   :target: https://coveralls.io/r/tkem/mopidy-mobile/
   :alt: Test coverage

- `Issue Tracker`_
- `Source Code`_
- `Change Log`_


License
------------------------------------------------------------------------

Copyright (c) 2015 Thomas Kemmer.

Licensed under the `Apache License, Version 2.0`_.


.. _Mopidy: http://www.mopidy.com/
.. _hybrid app: http://en.wikipedia.org/wiki/HTML5_in_mobile_devices#Hybrid_Mobile_Apps
.. _Chrome browser: https://play.google.com/store/apps/details?id=com.android.chrome

.. _pip: https://pip.pypa.io/en/latest/
.. _Google Play: https://play.google.com/store/apps/details?id=at.co.kemmer.mopidy_mobile
.. _Android: https://www.google.at/search?q=android+chrome+add+to+homescreen
.. _iOS: https://www.google.at/search?q=ios+safari+add+to+homescreen

.. _Ionic: http://ionicframework.com/
.. _AngularJS: https://angularjs.org/
.. _Apache Cordova: http://cordova.apache.org/
.. _npm: http://www.npmjs.org/
.. _gulp: http://gulpjs.com/
.. _installation guide: http://ionicframework.com/docs/guide/installation.html

.. _Issue Tracker: https://github.com/tkem/mopidy-mobile/issues/
.. _Source Code: https://github.com/tkem/mopidy-mobile/
.. _Change Log: https://github.com/tkem/mopidy-mobile/blob/master/CHANGES.rst

.. _Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
