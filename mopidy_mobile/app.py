from __future__ import unicode_literals

import logging
import os

import tornado.web

WWW_DIR = os.path.join(os.path.dirname(__file__), 'www')

logger = logging.getLogger(__name__)


def factory(config, core):
    logger.info('Mopidy-Mobile static directory is %s', WWW_DIR)
    return [
        (r'/', tornado.web.RedirectHandler, {'url': 'index.html'}),
        (r'/(.*)', tornado.web.StaticFileHandler, {'path': WWW_DIR})
    ]
