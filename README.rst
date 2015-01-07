Mopidy-Mobile
========================================================================

Mopidy-Mobile is a Mopidy_ Web extension for mobile devices, currently
targeting iOS 7+ and Android 4.4, and - some day, maybe - a hybrid
mobile client app.

This project is in early development.  Currently, it is not more than
a UI mockup/prototype, and will not even connect to your Mopidy
installation.  Initial working releases will be announced via the
Mopidy announcement mailing list and/or discussion forum.


Installation
------------------------------------------------------------------------

To build Mopidy-Mobile from source, you need to have at least npm_
installed.  Then run::

  npm install -g ionic gulp
  npm install
  gulp install
  gulp dist


Configuration
------------------------------------------------------------------------

TBD.


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

.. _Issue Tracker: https://github.com/tkem/mopidy-mobile/issues/
.. _Source Code: https://github.com/tkem/mopidy-mobile/
.. _Change Log: https://github.com/tkem/mopidy-mobile/blob/master/CHANGES.rst

.. _Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
