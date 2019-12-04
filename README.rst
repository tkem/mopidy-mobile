Mopidy Mobile
========================================================================

Mopidy Mobile is a simple, easy to use remote that lets you fully
control a Mopidy_ music server from your mobile device.  It is
available as a `Web client extension
<http://mopidy.readthedocs.org/en/latest/ext/web/>`_ and a `hybrid app
<http://en.wikipedia.org/wiki/HTML5_in_mobile_devices#Hybrid_Mobile_Apps>`_
for Android version 4.4 and later.  Users of older Android versions
may still access the Web extension using Google's `Chrome browser
<https://play.google.com/store/apps/details?id=com.android.chrome>`_.
On Apple devices, the Web client should work when running iOS 7 or
later.

In a nutshell, Mopidy Mobile lets you

- browse and search your entire Mopidy music library.
- search within selected directories only.
- edit the tracks in the current tracklist.
- create and edit playlists (requires Mopidy server v1.x).
- retrieve cover art from selected online resources.
- choose from multiple available user interface languages.

Additionally, the Android app allows you to

- control playback from your device's lock screen.
- change volume using your device's hardware buttons.
- switch between multiple Mopidy servers on your network.


Installation
------------------------------------------------------------------------

The Web extension can be installed from PyPi_ by running::

  pip install Mopidy-Mobile

The Android app is available from the `Google Play
<https://play.google.com/store/apps/details?id=at.co.kemmer.mopidy_mobile>`_
store.  You may also join the `Beta testing program
<https://play.google.com/apps/testing/at.co.kemmer.mopidy_mobile>`_ to
preview unreleased versions.

Note that the Web client is designed to be added to your home screen,
so it is launched in full-screen "app mode".  If you don't know how to
add a Web application to your home screen, there are plenty of
instructions available online for both `Android
<https://www.google.at/search?q=android+chrome+add+to+homescreen>`_
and `iOS
<https://www.google.at/search?q=ios+safari+add+to+homescreen>`_.


Configuration
------------------------------------------------------------------------

The following configuration values are available for the Web
extension:

- ``mobile/enabled``: Whether the extension should be enabled.
  Defaults to ``true``.

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

Mopidy Mobile is built using `Ionic v1
<http://ionicframework.com/docs/v1/>`_, `AngularJS
<https://angularjs.org/>`_ and `Apache Cordova
<http://cordova.apache.org/>`_, so it is recommended to familiarize
yourself with these before you start.

To build the Mopidy Web extension, you need to have `npm
<http://www.npmjs.org/>`_ and `gulp <http://gulpjs.com/>`_ installed.
Then run::

  npm install
  gulp install
  gulp dist
  pip install --editable .

To build the app for Android, please follow Ionic's `installation
guide <http://ionicframework.com/docs/guide/installation.html>`_ to
make sure you have everything needed for Android development.  Then,
in addition to the commands above, run::

  ionic cordova platform add android
  ionic cordova build android

Please refer to the `Ionic CLI <http://ionicframework.com/docs/cli/>`_
documentation for further information on how to run the app on an
actual device, or in a Web browser or emulator for testing.

Due to lack of resources, iOS is *not* supported, and it is unlikely
that the app will run unchanged on that platform.  However, being a
hybrid app, it shouldn't take too much effort to make it work, so
please feel free to fork and give it a try!


Contributing Translations
------------------------------------------------------------------------

If you'd like to see Mopidy Mobile in *your* native language, start by
having a look at the existing `translations <./www/app/locale>`_.
Mopidy Mobile uses `angular-translate
<https://angular-translate.github.io/>`_ for internationalization, and
stores translations as simple text files.  Just take one of the
existing files and replace all foreign language text as you see fit.
Words within curly brackets ``{...}`` are placeholders, used either
for variable names (``{name}``) which needn't be translated, or for
pluralization (``{count, plural, one{1 Sekunde} other{# Sekunden}}``)
so you can provide different texts for zero (=0), one, or multiple
(``other``, with ``#`` being replaced by the actual number) seconds or
tracks.  When you're done, please open a new issue - or even a
full-fledged pull request, if you like - for submitting your
translations.


Project Resources
------------------------------------------------------------------------

.. image:: http://img.shields.io/pypi/v/Mopidy-Mobile.svg?style=flat
    :target: https://pypi.python.org/pypi/Mopidy-Mobile/
    :alt: Latest PyPI version

.. image:: http://img.shields.io/travis/tkem/mopidy-mobile/master.svg?style=flat
    :target: https://travis-ci.org/tkem/mopidy-mobile/
    :alt: Travis CI build status

- `Issue Tracker`_
- `Source Code`_
- `Change Log`_


License
------------------------------------------------------------------------

Copyright (c) 2015-2019 Thomas Kemmer.

Translations: `slimer <https://github.com/slimer/>`_ (Español,
Català), `Andrzej Raczkowski <https://github.com/araczkowski/>`_
(Polski), `Peter Kuderjavy <mailto:kuderjavy@gmail.com>`_ (Slovak),
`Gilbert Brault <https://github.com/gbrault>`_ (Français).

Licensed under the `Apache License, Version 2.0`_.


.. _Mopidy: http://www.mopidy.com/

.. _PyPI: https://pypi.python.org/pypi/Mopidy-Mobile/
.. _Issue Tracker: https://github.com/tkem/mopidy-mobile/issues/
.. _Source Code: https://github.com/tkem/mopidy-mobile/
.. _Change Log: https://github.com/tkem/mopidy-mobile/blob/master/CHANGELOG.rst

.. _Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
