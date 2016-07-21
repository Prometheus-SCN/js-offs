"use strict"
const fs = require('fs')
const ows= require('./writable-off-stream')
const OffUrl =require('./off-url')
const pth = require('path')
const mime = require('mime')
const streamifier = require('streamifier')

mime.define({'offsystem/directory':['ofd'] })
module.exports = importer

function importer (path,callback) {
  path = pth.join(path)

  if (!callback) {
    throw new Error("No Callback Method Provided")
  }

  fs.stat(path, function (err, stats) {
    if (err) {
      return callback(err, files)
    }
    if (stats.isFile()) {
      let url= new OffUrl()
      url.fileName= pth.basename(path)
      url.contentType = mime.lookup(path)
      let ws= new ows('../block_cache',{url: url})
      let rs= fs.createReadStream(path)
      rs.on('error', (err)=> { callback(err)})
      ws.on('error', (err)=> { callback(err)})
      ws.on('url', (url)=> {
        callback(null, url)
      })
      rs.pipe(ws)
    } else if (stats.isDirectory()) {
      let ofd = new Buffer(0)
      let url= new OffUrl()
      url.fileName= pth.basename(path) + '.ofd'
      url.contentType = 'offsystem/directory'
      fs.readdir(path, function (err, items) {
        if (err) {
          return callback(err)
        }
        let contents = items.map(function (item) {
          return pth.join(path, item)
        })

        let i = -1
        let current;
        let next = function (err, url) {
          if(err){
            return callback(err)
          }
          if (url){
            ofd= Buffer.concat([ofd, new Buffer(url.toString() + '\n')])
          }
          i++
          if (i < contents.length) {
            current = contents[ i ]
            importer(current, next)
          } else {
            let ws= new ows('../block_cache',{url: url})
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
