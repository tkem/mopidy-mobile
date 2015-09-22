from __future__ import unicode_literals

import os
import re

from setuptools import find_packages, setup

assert os.path.exists('mopidy_mobile/www/mopidy-mobile.bundle.min.js')


def get_version(filename):
    with open(filename) as fh:
        metadata = dict(re.findall("__([a-z]+)__ = '([^']+)'", fh.read()))
        return metadata['version']

setup(
    name='Mopidy-Mobile',
    version=get_version('mopidy_mobile/__init__.py'),
    url='https://github.com/tkem/mopidy-mobile',
    license='Apache License, Version 2.0',
    author='Thomas Kemmer',
    author_email='tkemmer@computer.org',
    description='Mopidy Web client extension for mobile devices',
    long_description=open('README.rst').read(),
    packages=find_packages(exclude=['tests', 'tests.*']),
    zip_safe=False,
    include_package_data=True,
    install_requires=[
        'setuptools',
        'Mopidy >= 0.19'
    ],
    entry_points={
        'mopidy.ext': [
            'mobile = mopidy_mobile:Extension',
        ],
    },
    classifiers=[
        'Environment :: Web Environment',
        'Intended Audience :: End Users/Desktop',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 2',
        'Topic :: Multimedia :: Sound/Audio :: Players',
    ],
)
