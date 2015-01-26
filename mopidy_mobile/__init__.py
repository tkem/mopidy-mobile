from __future__ import unicode_literals

from mopidy import config, ext

__version__ = '0.1.1'


class Extension(ext.Extension):

    dist_name = 'Mopidy-Mobile'
    ext_name = 'mobile'
    version = __version__

    def get_default_config(self):
        from os import path
        conf_file = path.join(path.dirname(__file__), 'ext.conf')
        return config.read(conf_file)

    def get_config_schema(self):
        schema = super(Extension, self).get_config_schema()
        schema['title'] = config.String()
        return schema

    def setup(self, registry):
        from .app import factory
        registry.add('http:app', {'name': 'mobile', 'factory': factory})
