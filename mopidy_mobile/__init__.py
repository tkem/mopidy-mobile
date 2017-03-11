from __future__ import unicode_literals

import os

from mopidy import config, ext

__version__ = '1.8.1'


class Extension(ext.Extension):

    dist_name = 'Mopidy-Mobile'
    ext_name = 'mobile'
    version = __version__

    def get_config_schema(self):
        schema = super(Extension, self).get_config_schema()
        schema['title'] = config.String()
        schema['ws_url'] = config.String(optional=True)
        return schema

    def get_default_config(self):
        return config.read(os.path.join(os.path.dirname(__file__), 'ext.conf'))

    def setup(self, registry):
        registry.add('http:app', {'name': 'mobile', 'factory': self.factory})

    def factory(self, config, core):
        from tornado.web import RedirectHandler
        from .web import IndexHandler, StaticHandler
        path = os.path.join(os.path.dirname(__file__), 'www')
        return [
            (r'/', RedirectHandler, {'url': 'index.html'}),
            (r'/(.*\.html)', IndexHandler, {'config': config, 'path': path}),
            (r'/(.*\.json)', IndexHandler, {'config': config, 'path': path}),
            (r'/(.*)', StaticHandler, {'path': path})
        ]
