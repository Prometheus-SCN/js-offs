"use strict"
const fs = require('fs')
const ows= require('./writable-off-stream')
const OffUrl =require('./off-url')
const pth = require('path')
const mime = require('mime')
const streamifier = require('streamifier')
const BlockCache = require('./block-cache')
let basename
if(/^win/.test(process.platform)){
  basename=pth.win32.basename
} else {
  basename=pth.posix.basename
}
mime.define({'offsystem/directory':['ofd'] })
module.exports = importer

function importer (path, options, callback) {
  if (!path) {
    throw new Error("Invalid Path")
  }
  path = pth.join(path)
  if (!options) {
    throw new Error("Invalid Options")
  }
  if (options instanceof BlockCache) {
    options = { bc: options }
  }
  if (!options.bc) {
    throw new Error('Invalid Block Cache')
  }
  let bc= options.bc
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
      let ws= new ows({ bc: bc, url: url})
      let rs= fs.createReadStream(path)
      rs.on('error', (err)=> { callback(err)})
      ws.on('error', (err)=> { callback(err)})
      ws.on('url', (url)=> {
        process.nextTick(()=>{callback(null, url)})
      })
      rs.pipe(ws)
    } else if (stats.isDirectory()) {
      let ofd = new Buffer(0)
      let _url= new OffUrl()
      _url.fileName= pth.basename(path) + '.ofd'
      _url.contentType = 'offsystem/directory'
      fs.readdir(path, function (err, items) {
        if (err) {
          return process.nextTick(()=>{callback(err)})
        }
        let contents = items.map(function (item) {
          return pth.join(path, item)
        })

        let i = -1
        let current;
        let next = (err, url) => {
          if(err){
            return process.nextTick(()=>{callback(err)})
          }
          if (url){
            ofd= Buffer.concat([ofd, new Buffer(url.toString() + '\n')])
          }
          i++
          if (i < contents.length) {
            current = contents[ i ]
            importer(current, {bc: bc}, next)
          } else {
            let ws= new ows({bc: bc , url: _url})
            let rs= streamifier.createReadStream(ofd)
            rs.on('error', (err)=> { callback(err)})
            ws.on('error', (err)=> { callback(err)})
            ws.on('url', (url)=> {
              process.nextTick(()=>{callback(null, url)})
            })
            rs.pipe(ws)
          }
        }
        next()
      })
    }

  })

}
