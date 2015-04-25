from __future__ import unicode_literals

import logging
import string

import tornado.web

from . import Extension

logger = logging.getLogger(__name__)


class StaticHandler(tornado.web.StaticFileHandler):

    def get(self, path, *args, **kwargs):
        version = self.get_argument('v', None)
        if version:
            logger.debug('Get static resource for %s?v=%s', path, version)
        else:
            logger.debug('Get static resource for %s', path)
        return super(StaticHandler, self).get(path, *args, **kwargs)

    @classmethod
    def get_version(cls, settings, path):
        return Extension.version


class IndexHandler(tornado.web.RequestHandler):

    def initialize(self, config, path):
        ext_config = config[Extension.ext_name]
        self.__dict = {
            'ws_url': ext_config['ws_url'] or '',
            'version': Extension.version
        }
        self.__path = path
        self.__title = string.Template(ext_config['title'])

    def get(self, path):
        return self.render(path, title=self.get_title(), **self.__dict)

    def get_title(self):
        hostname, sep, port = self.request.host.rpartition(':')
        if not sep or not port.isdigit():
            hostname, port = self.request.host, '80'
        return self.__title.safe_substitute(hostname=hostname, port=port)

    def get_template_path(self):
        return self.__path

    def static_url(self, path, **kwargs):
        return StaticHandler.make_static_url({
            'static_url_prefix': '',
            'static_path': self.__path
        }, path, **kwargs)
