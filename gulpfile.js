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
var uglify = require('gulp-uglifyjs');

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
    .pipe(minifyCss({keepSpecialComments: 0}))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest(paths.css))
    .on('end', done);
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

gulp.task('uglify', function(done) {
  gulp.src(['www/js/*.js', '!www/js/*.min.js'])
    .pipe(uglify('mopidy-mobile.min.js', {mangle: false}))
    .pipe(gulp.dest(paths.js))
    .on('end', done);
});

gulp.task('dist', ['sass', 'uglify'], function() {
  gulp.src('www/tornado.html')
    .pipe(rename('index.html'))
    .pipe(gulp.dest(paths.dist));
  gulp.src('www/{images,templates,lib/ionic/fonts}/*', {base: 'www'})
    .pipe(gulp.dest(paths.dist));
  gulp.src('www/css/*.min.css', {base: 'www'})
    .pipe(gulp.dest(paths.dist));
  gulp.src([
    'www/js/mopidy-mobile.min.js',
    'www/lib/angular-translate/angular-translate.min.js',
    'www/lib/ionic/js/ionic.bundle.min.js',
  ])
    .pipe(gulp.dest(paths.dist + '/js/'));
});

gulp.task('clean', function(cb) {
  del([paths.dist, paths.css, paths.js + '/*.min.js'], cb);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('default', ['sass', 'jshint']);
