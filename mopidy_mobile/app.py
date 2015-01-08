from __future__ import unicode_literals

import logging
import os

import tornado.web

WWW_DIR = os.path.join(os.path.dirname(__file__), 'www')

logger = logging.getLogger(__name__)


class IndexHandler(tornado.web.RequestHandler):

    def initialize(self, config):
        from . import Extension
        self._template_kwargs = {
            'title': config[Extension.ext_name]['title']
        }

    def get(self, path):
        return self.render('index.html', **self._template_kwargs)

    def get_template_path(self):
        return WWW_DIR


def factory(config, core):
    logger.info('Mopidy-Mobile static directory is %s', WWW_DIR)
    return [
        (r'/', tornado.web.RedirectHandler, {'url': 'index.html'}),
        (r'/(index.html)', IndexHandler, {'config': config}),
        (r'/(.*)', tornado.web.StaticFileHandler, {'path': WWW_DIR})
    ]
