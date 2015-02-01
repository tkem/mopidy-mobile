from __future__ import unicode_literals

import tornado.web

from . import Extension


class StaticHandler(tornado.web.StaticFileHandler):

    @classmethod
    def get_version(cls, settings, path):
        return Extension.version


class IndexHandler(tornado.web.RequestHandler):

    def initialize(self, config, path):
        self._template_kwargs = {
            'title': config[Extension.ext_name]['title'],
            'ws_url': config[Extension.ext_name]['ws_url'] or '',
            'version': Extension.version
        }
        self._path = path

    def get(self, path):
        return self.render('index.html', **self._template_kwargs)

    def get_template_path(self):
        return self._path

    def static_url(self, path, **kwargs):
        return StaticHandler.make_static_url({
            'static_url_prefix': '',
            'static_path': self._path
        }, path, **kwargs)
