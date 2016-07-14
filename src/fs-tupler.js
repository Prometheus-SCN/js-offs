"use strict"
const fs = require('fs')
const pth = require('path')
const mime = require('mime')
module.exports = fsTupler

function fsTupler (path, arr, callback) {
  path = pth.join(path)
  if (typeof arr == 'function') {
    callback = arr
    arr = null
  }
  if (!callback) {
    throw new Error("No Callback Method Provided")
  }
  let files = []
  if (Array.isArray(arr)) {
    files = arr.concat(files)
  }

  fs.stat(path, function (err, stats) {
    if (err) {
      return callback(err, files)
    }
    if (stats.isFile()) {
      files.push({ path: path, name: pth.basename(path), stream: fs.createReadStream(path), size: stats.size, mime: mime.lookup(path)})
      return callback(null, files)
    } else if (stats.isDirectory()) {
      files.push({ path: path, name: pth.basename(path), size: stats.size, directory: true})
      fs.readdir(path, function (err, items) {
        if (err) {
          return callback(err, files)
        }
        let contents = items.map(function (item) {
          return pth.join(path, item)
        })

        let i = 0
        let current;
        let next = function (err, array) {
          files = array
          i++
          if (i < contents.length) {
            current = contents[ i ]
            fsTupler(current, files, next)
          } else {
            return callback(null, files)
          }
        }

        if (i < contents.length) {
          current = contents[ i ]
          fsTupler(current, files, next)
        } else {
          return callback(null, files)
        }
      })
    }

  })

}
