Mopidy Mobile
========================================================================

Mopidy Mobile is a Mopidy_ Web client extension and hybrid mobile app,
currently supporting iOS 7+ and Android 4.4 and higher.  Users of
older Android versions may still access the Web extension using
Google's `Chrome browser`_.


Installation
------------------------------------------------------------------------

The Web extension can be installed using pip_ by running::

  pip install Mopidy-Mobile

The Android app is available for beta testing for members of the
Mopidy `announcement mailing list`_.  If you are a member and want to
participate in testing, please follow these instructions_.


Configuration
------------------------------------------------------------------------

Note that configuration settings for the Web extension are still
subject to change::

  [mobile]
  enabled = true

  # application title - $hostname and $port can be used in the title
  title = Mopidy Mobile on $hostname

  # WebSocket URL - set this if Mopidy's WebSocket is not available at
  # its default path /mopidy/ws/, e.g. when using a reverse proxy
  ws_url =


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

  ionic platform add android
  ionic resources
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
.. _Chrome browser: https://play.google.com/store/apps/details?id=com.android.chrome

.. _pip: https://pip.pypa.io/en/latest/
.. _announcement mailing list: https://groups.google.com/d/forum/mopidy
.. _instructions: https://play.google.com/apps/testing/com.ionicframework.mopidymobile190318

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
