const fs = require("fs")
const browserify = require('browserify')
const vueify = require('vueify')
const path = require('path')
const viewPath = './src/electron/views'
fs.readdir(viewPath, (err, content) => {
  if (err) {
    throw err
  }
  for (let dir of  content) {
    browserify(path.join(viewPath, dir,'main.js'))
      .transform(vueify)
      .bundle()
      .pipe(fs.createWriteStream(path.join(viewPath, dir,'index.js')))
  }
})
