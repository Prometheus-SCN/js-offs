'use strict'
const express = require('express')
const OffUrl = require('./off-url')
const collect = require('collect-stream')
const config = require('../config')
const through = require('through2')
const pth = require('path')
let basename
let parse = pth.posix.parse
if (/^win/.test(process.platform)) {
  basename = pth.win32.basename
} else {
  basename = pth.posix.basename
}

module.exports = function (br) {
  let off = express()
  off.get(/\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([^ !$`&*()+]*|\\[ !$`&*()+]*)+/,
    (req, res)=> {
      let start = 0
      let end = parseInt(req.params[ 1 ])
      /*
      if (req.headers.range) {
        let range = req.headers.range
        let positions = range.replace(/bytes=/, "").split("-")
        start = positions[ 0 ] ? parseInt(positions[ 0 ]) : null
        end = positions[ 1 ] ? parseInt(positions[ 1 ]) : req.params[ 1 ]
      }*/
      let url = new OffUrl()
      url.contentType = req.params[ 0 ]
      url.streamOffset = start
      url.streamLength = parseInt(req.params[ 1 ])
      url.streamOffsetLength = parseInt(end)
      url.fileHash = req.params[ 2 ]
      url.descriptorHash = req.params[ 3 ]
      url.fileName = req.params[ 4 ]
      let rs
      try {
        rs = br.createReadStream(url)
      } catch(ex) {
       return res.status(500).send(ex.message)
      }
      if (url.contentType === 'offsystem/directory') {
        collect(rs, (err, data)=> {
          if (!data) {
            return res.status(404).send("Resource Not Found")
          }
          let lines = data.toString('utf8').split('\n')
          console.log(data.toString())
          console.log(lines)
          let stats = parse(url.fileName)
          if (stats.dir) {
            let dirs = stats.dir.split('/')
            let i = -1
            let next = (err, data)=> {
              if (err) {
                throw err
              }
              if (!data && i != -1) {
                return res.status(404).send("Resource Not Found")
              }
              if (data) {
                lines = data.toString('utf8').split('\n')
              }
              i++
              if (i < dirs.length) {
                let reg = /\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\//
                let file = dirs[ i ] + ".ofd"
                let found
                let path = lines.find((line)=> {
                  return basename(line) == file
                })
                if (path) {
                  let matches = path.match(reg)
                  let url = new OffUrl()
                  url.contentType = matches[ 1 ]
                  url.streamLength = parseInt(matches[ 2 ])
                  url.fileHash = matches[ 3 ]
                  url.descriptorHash = matches[ 4 ]
                  url.fileName = file
                  let rs = br.createReadStream(url)
                  rs.on('eror', (err)=> {
                    res.status(500).send(err)
                  })
                  if (url.contentType === 'offsystem/directory') {
                    collect(rs, next)
                  }
                } else {
                  return res.status(404).send("Resource Not Found")
                }
              } else {
                let reg = /\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\//
                let path = lines.find((line)=> {
                  return basename(line) == stats.base
                })
                if (path) {
                  let matches = path.match(reg)
                  let url = new OffUrl()
                  url.contentType = matches[ 1 ]
                  url.streamLength = parseInt(matches[ 2 ])
                  url.fileHash = matches[ 3 ]
                  url.descriptorHash = matches[ 4 ]
                  url.fileName = stats.base
                  let rs = br.createReadStream(url)
                  rs.on('eror', (err)=> {
                    res.status(500).send(err)
                  })
                  if (url.contentType === 'offsystem/directory') {
                    collect(rs, (err, data)=> {
                      let lines = data.toString('utf8').split('\n')
                      let reg = /\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\//
                      let index = lines.find((line)=> {
                        return basename(line) == "index.html"
                      })
                      if (index) {
                        let url = new OffUrl()
                        let matches = index.match(reg)
                        url.contentType = matches[ 1 ]
                        url.streamLength = parseInt(matches[ 2 ])
                        url.fileHash = matches[ 3 ]
                        url.descriptorHash = matches[ 4 ]
                        url.fileName = "index.html"
                        let rs = br.createReadStream(url)
                        res.type(url.contentType)
                        return rs.pipe(res)
                      } else {
                        res.write(data)
                        res.end
                      }

                    })
                  } else {
                    return rs.pipe(res)
                  }

                } else {
                  return res.status(404).send("Resource Not Found")
                }
              }
            }
            next()
          } else {
            let reg = /\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\//
            let index = lines.find((line)=> {
              return basename(line) == "index.html"
            })
            if (index) {
              let url = new OffUrl()
              let matches = index.match(reg)
              url.contentType = matches[ 1 ]
              url.streamLength = parseInt(matches[ 2 ])
              url.fileHash = matches[ 3 ]
              url.descriptorHash = matches[ 4 ]
              url.fileName = "index.html"
              let rs = br.createReadStream(url)
              rs.on('eror', (err)=> {
                res.status(500).send(err)
              })
              res.type(url.contentType)
              return rs.pipe(res)
            } else {
              res.write(data)
              res.end
            }
          }
        })
      } else {
       /* if (req.headers.range) {
          let length = end - start
          let code = (length === url.streamLength ? 200 : 206)
          res.writeHead(code, {
            "Content-Range": "bytes " + start + "-" + end + "/" + req.params[ 1 ],
            "Accept-Ranges": "bytes",
            "Content-Type": url.contentType
          })
        } else {*/
          res.writeHead(200, {
            "Content-Type": url.contentType
          })
        }
        rs.pipe(res)
      //}
    })

  off.put('/offsystem/', (req, res)=> {
    let url = new OffUrl()
    url.serverAddress = req.get('server-address') || url.serverAddress
    url.contentType = req.get('type')
    url.fileName = req.get('file-name')
    url.streamLength = parseInt(req.get('stream-length'))
    let ws = br.createWriteStream(url)
    ws.on('url', (url)=> {
      res.write(url.toString())
      res.end()
    })
    req.pipe(ws)

  })
  off.use(express.static(pth.join(__dirname, 'static')))
  return off
}