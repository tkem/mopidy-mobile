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

var paths = {
  sass: ['scss/**/*.scss'],
  css: 'www/css/',
  js: 'www/js/',
  images: 'www/images',
  dist: 'mopidy_mobile/www/'
};

gulp.task('install', function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('sass', function(done) {
  gulp.src('scss/[^_]*.scss')
    .pipe(sass())
    .pipe(gulp.dest('www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest(paths.css))
    .on('end', done);
});

gulp.task('jshint', function() {
  return gulp.src(['www/js/**/*.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(require('jshint-summary')({
      fileColCol: ',bold',
      positionCol: ',bold',
      codeCol: 'green,bold',
      reasonCol: 'cyan'
    })))
    .pipe(jshint.reporter('fail'));
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('dist', ['sass'], function() {
  gulp.src('www/tornado.html')
    .pipe(rename('index.html'))
    .pipe(gulp.dest(paths.dist));
  // FIXME: only copy minified files
  gulp.src([
    'www/{css,js,images,templates}/*',
    'www/lib/ionic/js/ionic.bundle.js',
    'www/lib/ionic/fonts/*'
  ], {base: 'www'})
    .pipe(gulp.dest(paths.dist));
});

gulp.task('clean', function(cb) {
  del([paths.dist, paths.css], cb);
});

gulp.task('default', ['sass', 'jshint']);
