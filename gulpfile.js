var bower = require('bower');
var concat = require('gulp-concat');
var del = require('del');
var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sh = require('shelljs');
var templateCache = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');

var paths = {
  build: 'build/',
  css: 'www/css/',
  dist: 'mopidy_mobile/www/',
  images: 'www/images/',
  lib: 'www/lib/'
};

gulp.task('install', function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('sass:images', function() {
  return gulp.src('scss/**/*.png', {base: 'scss'})
    .pipe(gulp.dest(paths.css));
});

gulp.task('sass', ['sass:images'], function() {
  return gulp.src('scss/[^_]*.scss')
    .pipe(sass())
    .pipe(gulp.dest(paths.css))
    .pipe(minifyCss({keepSpecialComments: 0}))
    .pipe(rename({extname: '.min.css'}))
    .pipe(gulp.dest(paths.css));
});

gulp.task('jshint', function() {
  return gulp.src(['www/app/**/*.js', 'merges/*/app/**/*.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('uglify', function() {
  return gulp.src(['www/app/**/*.js'])
    .pipe(concat('mopidy-mobile.js'))
    .pipe(ngAnnotate({single_quotes: true}))
    .pipe(uglify({mangle: false}))
    .pipe(rename({extname: '.min.js'}))
    .pipe(gulp.dest(paths.build));
});

gulp.task('templates', function () {
  return gulp.src('www/app/**/*.html')
    .pipe(templateCache({module: 'app', root: 'app/'}))
    .pipe(uglify())
    .pipe(rename('templates.min.js'))
    .pipe(gulp.dest(paths.build));
});

gulp.task('bundle', ['uglify', 'templates'], function() {
  return gulp.src([
    paths.lib + '/mopidy/dist/mopidy.min.js',
    paths.lib + '/ionic/release/js/ionic.bundle.min.js',
    paths.lib + '/angular-local-storage/dist/angular-local-storage.min.js',
    paths.lib + '/angular-translate/angular-translate.min.js',
    paths.build + '/mopidy-mobile.min.js',
    paths.build + '/templates.min.js'
  ]).pipe(concat('mopidy-mobile.bundle.min.js'))
    .pipe(gulp.dest(paths.dist));
});

gulp.task('dist', ['sass', 'bundle'], function() {
  return gulp.src([
    'www/css/*.min.css',
    'www/css/**/*.png',
    'www/images/**',
    'www/lib/ionic/release/fonts/**'
  ], {base: 'www'})
    .pipe(gulp.dest(paths.dist));
});

gulp.task('clean', function(cb) {
  del([
    paths.build,
    paths.css,
    paths.dist + '{css,images,lib,bundle.min.js}'
  ], cb);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('default', ['sass', 'jshint']);
