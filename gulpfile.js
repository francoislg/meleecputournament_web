var watchify = require('watchify');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var uglify = require("gulp-uglify");
var sourcemaps = require('gulp-sourcemaps');
var assign = require('lodash.assign');

// add custom browserify options here
var customOpts = {
  entries: ['./src/index.js']
};

gulp.task('watch', function() {
    var opts = assign({
        debug:true
    }, watchify.args, customOpts);
    var watchifier = watchify(browserify(opts));
    watchifier.on('update', bundle); // on any dep update, runs the bundler
    watchifier.on('log', gutil.log); // output build logs to terminal
    function bundle() {
        return watchifier.bundle()
          // log errors if they happen
          .on('error', gutil.log.bind(gutil, 'Browserify Error'))
          .pipe(source('bundle.js'))
          // optional, remove if you don't need to buffer file contents
          .pipe(buffer())
          // optional, remove if you dont want sourcemaps
          .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
             // Add transformation tasks to the pipeline here.
          .pipe(sourcemaps.write('./')) // writes .map file
          .pipe(gulp.dest('./dist'));
    }
    return bundle();
}); // so you can run `gulp js` to build the file


gulp.task('browserify', function () {
    var opts = assign({}, customOpts);
    var browserifier = browserify(opts);
  // set up the browserify instance on a task basis
  return browserifier.bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())
        .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist'));
});

gulp.task("default", ["browserify"]);
