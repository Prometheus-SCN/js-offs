const gulp = require('gulp')
const exec = require('child_process').execFileSync

gulp.task('vue', function () {
  const args = ['-t',  'vueify ', '-e', 'src/main.js', '-o', 'build/build.js']
  exec('./node_modules/.bin/browserify')
})