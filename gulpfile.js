var bower = require('bower');
var cleanCss = require('gulp-clean-css');
var del = require('del');
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var rename = require ('gulp-rename');
var sass = require('gulp-sass')(require('sass'));

var paths = {
  'build': 'build/',
  'css': 'www/css/',
  'dist': 'mopidy_mobile/www/',
  'images': 'www/images/',
  'lib': 'www/lib/',
  'sass': 'scss/'
};

gulp.task('install', function(cb) {
  bower.commands.install()
    .on('log', function(data) {
      plugins.util.log('bower', plugins.util.colors.cyan(data.id), data.message);
    })
    .on('end', function() {
      cb()
    });
});

gulp.task('sass:images', function() {
  return gulp.src('scss/**/*.png', {base: 'scss'})
    .pipe(gulp.dest(paths.css));
});

gulp.task('sass', gulp.series('sass:images', function() {
  return gulp.src('scss/[^_]*.scss')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest(paths.css))
    .pipe(cleanCss({keepSpecialComments: 0}))
    .pipe(rename({extname: '.min.css'}))
    .pipe(gulp.dest(paths.css));
}));

gulp.task('jshint', function() {
  return gulp.src(['www/app/**/*.js', 'merges/*/app/**/*.js'])
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(plugins.jshint.reporter('default'))
    .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('uglify', function() {
  return gulp.src(['www/app/**/*.js'])
    .pipe(plugins.concat('mopidy-mobile.js'))
    .pipe(plugins.uglify({mangle: false, compress: false}))
    .pipe(plugins.rename({extname: '.min.js'}))
    .pipe(gulp.dest(paths.build));
});

gulp.task('templates', function() {
  return gulp.src('www/app/**/*.html')
    .pipe(plugins.angularTemplatecache({module: 'app', root: 'app/'}))
    .pipe(plugins.uglify())
    .pipe(plugins.rename('templates.min.js'))
    .pipe(gulp.dest(paths.build));
});

gulp.task('bundle', gulp.series(gulp.parallel('uglify', 'templates'), function() {
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

gulp.task('dist', gulp.series(gulp.parallel('sass', 'bundle'), function() {
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

gulp.task('clean', function() {
  return del([
    paths.build,
    paths.css,
    paths.dist + '{app,css,lib,*.min.js}'
  ]);
});

gulp.task('watch', gulp.series('sass', function() {
  return gulp.watch(paths.sass, gulp.series('sass'));
}));

gulp.task('default', gulp.parallel('sass', 'jshint'));
