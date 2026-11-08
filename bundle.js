#!/usr/bin/env node

// Create mopidy_mobile/www/mopidy-mobile.bundle.min.js from the
// application sources, the AngularJS templates and third-party
// libraries installed by bower.

'use strict';

var fs = require('fs');
var path = require('path');
var UglifyJS = require('uglify-js');

var APP_DIR = 'www/app';
var LIB_DIR = 'www/lib';
var OUTPUT = 'mopidy_mobile/www/mopidy-mobile.bundle.min.js';

var LIBS = [
  'mopidy/dist/mopidy.min.js',
  'ionic/js/ionic.bundle.min.js',
  'messageformat/messageformat.js',
  'angular-translate/angular-translate.min.js',
  'angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat.min.js'
];

function find(dir, ext) {
  return fs.readdirSync(dir, {withFileTypes: true}).sort(function(a, b) {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  }).reduce(function(result, entry) {
    var name = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return result.concat(find(name, ext));
    } else if (path.extname(name) === ext) {
      return result.concat([name]);
    } else {
      return result;
    }
  }, []);
}

function read(name) {
  return fs.readFileSync(name, 'utf8');
}

function minify(code, options) {
  var result = UglifyJS.minify(code, options);
  if (result.error) {
    throw result.error;
  }
  return result.code;
}

function templates(dir) {
  var base = path.dirname(dir);
  var body = find(dir, '.html').map(function(name) {
    var url = path.relative(base, name).split(path.sep).join('/');
    return '$templateCache.put(' + JSON.stringify(url) + ',' + JSON.stringify(read(name)) + ');';
  });
  return [
    'angular.module(\'app\').run([\'$templateCache\', function($templateCache) {'
  ].concat(body, ['}]);']).join('\n');
}

var app = minify(find(APP_DIR, '.js').map(read).join('\n'), {
  mangle: false,
  compress: false
});
var tmpl = minify(templates(APP_DIR));
var libs = LIBS.map(function(name) {
  return read(path.join(LIB_DIR, name));
});

fs.mkdirSync(path.dirname(OUTPUT), {recursive: true});
fs.writeFileSync(OUTPUT, libs.concat([app, tmpl]).join('\n'));
