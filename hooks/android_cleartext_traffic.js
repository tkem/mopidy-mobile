#!/usr/bin/env node

// Set android:usesCleartextTraffic="true" on the <application> element,
// so the app can connect to Mopidy servers via plain ws:// and http://.
//
// This cannot be done with <edit-config> in config.xml, since
// cordova-common treats any config.xml <edit-config> targeting
// /manifest/application as conflicting with plugins' <config-file>
// entries for the same parent, and removes those plugin entries
// (e.g. the music controls <service>) from the manifest.

var fs = require('fs');
var path = require('path');

module.exports = function(context) {
  var manifest = path.join(
    context.opts.projectRoot, 'platforms', 'android',
    'app', 'src', 'main', 'AndroidManifest.xml'
  );
  if (!fs.existsSync(manifest)) {
    return;
  }
  var xml = fs.readFileSync(manifest, 'utf8');
  if (/<application\b[^>]*android:usesCleartextTraffic=/.test(xml)) {
    xml = xml.replace(
      /(<application\b[^>]*android:usesCleartextTraffic=)"[^"]*"/,
      '$1"true"'
    );
  } else {
    xml = xml.replace(
      /<application\b/,
      '<application android:usesCleartextTraffic="true"'
    );
  }
  fs.writeFileSync(manifest, xml, 'utf8');
};
