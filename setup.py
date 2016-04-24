from __future__ import unicode_literals

from setuptools import find_packages, setup


def get_version(filename):
    from re import findall
    with open(filename) as f:
        metadata = dict(findall("__([a-z]+)__ = '([^']+)'", f.read()))
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
