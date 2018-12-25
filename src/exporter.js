const OffUrl= require('./off-url')
const path = require('path')
const mkdirp = require('mkdirp')
const http = require('http')
const collect = require('collect-stream')
const fs = require('fs')
const responder = require('electron-ipc-responder')
const util = require('./utility')
const Speed = require('streamspeed')

class rendererExporter extends responder {
  constructor (ipcRenderer, onPercent, onSpeed, onError) {
    super(ipcRenderer.send.bind(ipcRenderer), ipcRenderer.on.bind(ipcRenderer))
    this.registerTopic('percent', async (payload) => {
      onPercent(payload)
    })
    this.registerTopic('error',async (payload) => {
      onError(payload)
    })
    this.registerTopic('speed',async (payload) => {
      onSpeed(payload)
    })
  }
  async exporter (location, url, id) {
    await this.ask('export', {location, url, id})
  }
}

class mainExporter extends responder {
  constructor (webContents, ipcMain) {
    super(webContents.send.bind(webContents), ipcMain.on.bind(ipcMain))
    this.registerTopic('export', async (payload) => {
      this.exporter(payload)
    })
  }
  exporter (payload) {
    let url = OffUrl.parse(payload.url)
    let filename = path.join(payload.location, url.fileName)
    let streamLength = url.streamLength
    let percent = 0
    let size = 0
    let file = {filename, percent, size, streamLength}
    if (url.contentType === 'offsystem/directory') {
      file.filename = file.filename.replace('.ofd', '')
      let cb = (response) => {
        let speed = new Speed()
        speed.on('speed', (rate) => {
          this.tell('speed', {id: payload.id, rate})
        })
        speed.add(response)
        collect(response, async (err, data) => {
          if (err) {
            return this.tell('error', {id: payload.id, err})
          }
          let dir= url.fileName.replace('.ofd', '')
          mkdirp.sync(path.join(payload.location, dir))
          let ofd = JSON.parse(data)
          let contents = Object.entries(ofd)
          for (let [, value] of contents) {
            let url = OffUrl.parse(value)
            file.streamLength += url.streamLength
          }

          file.size += data.length
          file.percent = Math.floor((file.size/file.streamLength) * 100)
          this.tell('percent', {id: payload.id, percent: file.percent})

          let i = -1
          let next = async () => {
            i++
            if (i < contents.length) {
              let [key, value] = contents[i]
              let cb = (response) => {
                let fp = path.parse(key)
                if (fp.dir) {
                  mkdirp.sync(path.join(payload.location, dir, fp.dir))
                }
                let ws = fs.createWriteStream(path.join(payload.location, dir, key))
                let speed = new Speed()
                speed.on('speed', (rate) => {
                  this.tell('speed', {id: payload.id, rate})
                })
                speed.add(response)
                response.on('data', async (chunk) => {
                  file.size += chunk.length
                  file.percent = Math.floor((file.size/file.streamLength) * 100)
                  this.tell('percent', {id: payload.id, percent: file.percent})
                })
                ws.on('finish', () => {
                  return next()
                })
                ws.on('error', (err) => {
                  this.tell('error', {id: payload.id, err})
                })
                response.pipe(ws)
              }
              http.get(value, cb).on('error', (err) => {
                this.tell('error', {id: payload.id, err})
              })
            }
          }
          next()
        })
      }
      http.get(`${payload.url}?ofd=raw`, cb).on('error', (err) => {
        this.tell('error', {id: payload.id, err})
      })
    } else {
      let cb = (response) => {
        let ws = fs.createWriteStream(filename)
        let speed = new Speed()
        speed.on('speed', (rate) => {
          this.tell('speed', {id: payload.id, rate})
        })
        speed.add(response)

        ws.on('error', (err) => {
          this.tell('error', {id: payload.id, err})
        })
        response.on('data', (chunk) => {
          file.size += chunk.length
          file.percent = Math.floor((file.size/file.streamLength) * 100)
          this.tell('percent', {id: payload.id, percent: file.percent})
        })
        response.pipe(ws)
      }
      http.get(payload.url, cb).on('error', (err) => {
        this.tell('error', {id: payload.id, err})
      })
    }
  }
}


module.exports= {rendererExporter, mainExporter}