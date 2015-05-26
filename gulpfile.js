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
var uglifyjs = require('gulp-uglifyjs');

var paths = {
  css: 'www/css/',
  dist: 'mopidy_mobile/www/',
  images: 'www/images/',
  js: 'www/js/'
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
  return gulp.src(['www/js/*.js', '!www/js/*.min.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(require('jshint-summary')({
      fileColCol: ',bold',
      positionCol: ',bold',
      codeCol: 'green,bold',
      reasonCol: 'cyan'
    })))
    .pipe(jshint.reporter('fail'));
});

gulp.task('uglifyjs', function() {
  return gulp.src(['www/js/*.js', '!www/js/*.min.js'])
    .pipe(uglifyjs('mopidy-mobile.min.js', {mangle: false}))
    .pipe(gulp.dest(paths.js));
});

gulp.task('templatesjs', function () {
  gulp.src('www/templates/**/*.html')
    .pipe(templateCache({module: 'mopidy-mobile', root: 'templates/'}))
    .pipe(uglifyjs('templates.min.js'))
    .pipe(gulp.dest(paths.js));
});

gulp.task('bundlejs', ['uglifyjs', 'templatesjs'], function() {
  return gulp.src([
    'www/lib/mopidy/dist/mopidy.min.js',
    'www/lib/ionic/js/ionic.bundle.min.js',
    'www/lib/ngCordova/dist/ng-cordova-mocks.min.js',
    'www/lib/angular-local-storage/dist/angular-local-storage.min.js',
    'www/lib/angular-translate/angular-translate.min.js',
    'www/js/mopidy-mobile.min.js',
    'www/js/templates.min.js'
  ]).pipe(concat('mopidy-mobile.bundle.min.js'))
    .pipe(gulp.dest(paths.js));
});

gulp.task('dist', ['sass', 'bundlejs'], function() {
  return gulp.src([
    'www/css/*.min.css',
    'www/css/**/*.png',
    'www/images/**',
    'www/js/mopidy-mobile.bundle.min.js',
    'www/lib/ionic/fonts/**'
  ], {base: 'www'})
    .pipe(gulp.dest(paths.dist));
});

gulp.task('clean', function(cb) {
  del([
    paths.css,
    paths.dist + '{css,images,js,lib,templates}',
    paths.js + 'templates.js',
    paths.js + '*.min.js'
  ], cb);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('default', ['sass', 'jshint']);
