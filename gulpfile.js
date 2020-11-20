const { series, parallel } = require('gulp');

var bower = require('bower');
var del = require('del');
var gulp = require('gulp');
var paths = require('./gulp.config.json');
var plugins = require('gulp-load-plugins')();

var sass = require('gulp-sass');
var cleanCss = require('gulp-clean-css');
var rename = require ('gulp-rename');


gulp.task('install', function() {
  return bower.commands.install()
    .on('log', function(data) {
      plugins.util.log('bower', plugins.util.colors.cyan(data.id), data.message);
    });
});

gulp.task('sass:images', function() {
  return gulp.src('scss/**/*.png', {base: 'scss'})
    .pipe(gulp.dest(paths.css));
});

//gulp.task('sass', ['sass:images'], function() {
gulp.task('sass', gulp.series('sass:images', function() {
  return gulp.src('scss/[^_]*.scss')
    //.pipe(plugins.sass())
    .pipe(sass())
    .pipe(gulp.dest(paths.css))
    //.pipe(plugins.cleanCss({keepSpecialComments: 0}))
    .pipe(cleanCss({keepSpecialComments: 0}))
    //.pipe(plugins.rename({extname: '.min.css'}))
    .pipe(rename({extname: '.min.css'}))
    .pipe(gulp.dest(paths.css));
}) );

gulp.task('jshint', function() {
  return gulp.src(['www/app/**/*.js', 'merges/*/app/**/*.js'])
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(plugins.jshint.reporter('default'))
    .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('uglify', function() {
  return gulp.src(['www/app/**/*.js'])
    .pipe(plugins.concat('mopidy-mobile.js'))
    //.pipe(plugins.ngAnnotate({single_quotes: true}))
    .pipe(plugins.uglify({mangle: false}))
    .pipe(plugins.rename({extname: '.min.js'}))
    .pipe(gulp.dest(paths.build));
});

gulp.task('templates', function () {
  return gulp.src('www/app/**/*.html')
    .pipe(plugins.angularTemplatecache({module: 'app', root: 'app/'}))
    .pipe(plugins.uglify())
    .pipe(plugins.rename('templates.min.js'))
    .pipe(gulp.dest(paths.build));
});

//gulp.task('bundle', ['uglify', 'templates'], function() {
gulp.task('bundle', gulp.series( gulp.parallel('uglify', 'templates'), function() {
  return gulp.src([
    paths.lib + '/mopidy/dist/mopidy.min.js',
    paths.lib + '/ionic/js/ionic.bundle.min.js',
    paths.lib + '/messageformat/messageformat.js',
    paths.lib + '/angular-translate/angular-translate.min.js',
    paths.lib + '/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat.min.js',
    paths.build + '/mopidy-mobile.min.js',
    paths.build + '/templates.min.js'
  ]).pipe(plugins.concat('mopidy-mobile.bundle.min.js'))
    .pipe(gulp.dest(paths.dist));
}));

gulp.task('dist', gulp.series( gulp.parallel('sass', 'bundle'), function() {
  return gulp.src([
    'www/css/*.min.css',
    'www/css/**/*.png',
    'www/app/**/*.gif',
    'www/app/**/*.png',
    'www/app/**/*.svg',
    'www/lib/ionic/fonts/**',
  ], {base: 'www'})
    .pipe(gulp.dest(paths.dist));
}));

gulp.task('clean', function(cb) {
  del([
    paths.build,
    paths.css,
    paths.dist + '{app,css,lib,*.min.js}'
  ], cb);
});

//gulp.task('default', ['sass', 'jshint']);
gulp.task('default', gulp.parallel('sass', 'jshint'));
