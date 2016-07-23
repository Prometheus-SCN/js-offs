"use strict"
const fs = require('fs')
const ows= require('./writable-off-stream')
const OffUrl =require('./off-url')
const pth = require('path')
const mime = require('mime')
const streamifier = require('streamifier')
let basename
if(/^win/.test(process.platform)){
  basename=pth.win32.basename
} else {
  basename=pth.posix.basename
}
mime.define({'offsystem/directory':['ofd'] })
module.exports = importer

function importer (path, options, callback) {
  path = pth.join(path)
  let bcPath= options.bcPath
  if (!callback) {
    throw new Error("No Callback Method Provided")
  }

  fs.stat(path, (err, stats) => {
    if (err) {
      return callback(err, files)
    }
    if (stats.isFile()) {
      let url= new OffUrl()
      url.fileName= basename(path) //TODO: need to use the operating system specific variants
      url.contentType = mime.lookup(path)
      let ws= new ows({ path: bcPath, url: url}) 
      let rs= fs.createReadStream(path)
      rs.on('error', (err)=> { callback(err)})
      ws.on('error', (err)=> { callback(err)})
      ws.on('url', (url)=> {
        callback(null, url)
      })
      rs.pipe(ws)
    } else if (stats.isDirectory()) {
      let ofd = new Buffer(0)
      let _url= new OffUrl()
      _url.fileName= pth.basename(path) + '.ofd'
      _url.contentType = 'offsystem/directory'
      fs.readdir(path, function (err, items) {
        if (err) {
          return callback(err)
        }
        let contents = items.map(function (item) {
          return pth.join(path, item)
        })

        let i = -1
        let current;
        let next = (err, url) => {
          if(err){
            return callback(err)
          }
          if (url){
            ofd= Buffer.concat([ofd, new Buffer(url.toString() + '\n')])
          }
          i++
          if (i < contents.length) {
            current = contents[ i ]
            importer(current, {bcPath: bcPath}, next)
          } else {
            let ws= new ows({path:'../block_cache' , url: _url})
            let rs= streamifier.createReadStream(ofd)
            rs.on('error', (err)=> { callback(err)})
            ws.on('error', (err)=> { callback(err)})
            ws.on('url', (url)=> {
              callback(null, url)
            })
            rs.pipe(ws)
          }
        }
        next()
      })
    }

  })

}
