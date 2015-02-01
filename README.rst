Mopidy-Mobile
========================================================================

Mopidy-Mobile is a Mopidy_ Web extension and hybrid mobile app,
currently supporting iOS 7+ and Android 4.4.

This project is in early development.  At this time, it's still missing
some essential functionality, and it will not always work as expected.

Initial working releases will be announced on the `Mopidy mailing list`_
and/or `discussion forum`_.


Installation
------------------------------------------------------------------------

The Web extension can be installed using pip_ by running::

  pip install Mopidy-Mobile

For now, the Android app is available for beta testing for members of
the `Mopidy mailing list`_ only; if you are already a member and want
to participate in testing, please follow `these instructions`_.

To build Mopidy-Mobile from source, you need to have at least npm_
installed.  Then run::

  npm install -g ionic gulp
  npm install
  gulp install
  gulp dist


Configuration
------------------------------------------------------------------------

All of these are optional for now::

  [mobile]
  enabled = true

  # application title
  title = Mopidy Mobile Web Extension

  # WebSocket URL - set this if Mopidy's WebSocket is not available at
  # its default path /mopidy/ws/, e.g. if you're using a reverse proxy
  ws_url =


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

.. _pip: https://pip.pypa.io/en/latest/
.. _npm: http://www.npmjs.org/
.. _these instructions: https://play.google.com/apps/testing/com.ionicframework.mopidymobile190318

.. _Mopidy mailing list: https://groups.google.com/d/forum/mopidy
.. _discussion forum: https://discuss.mopidy.com/

.. _Issue Tracker: https://github.com/tkem/mopidy-mobile/issues/
.. _Source Code: https://github.com/tkem/mopidy-mobile/
.. _Change Log: https://github.com/tkem/mopidy-mobile/blob/master/CHANGES.rst

.. _Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
