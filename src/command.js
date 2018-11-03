const cmd = require('commander')
const http = require('http')
const pkg = require('../package.json')


module.exports = new (class Command {
  constructor (node) {
    cmd.name('offs')
    cmd.version(pkg.version, '-v, --version')
    cmd.option('-t, --terminal', 'Run in Terminal Only (without GUI)')
  }
  parse() {
    cmd.parse(process.argv)
    return cmd
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
        collect(response, async (err, data) => {
          if (err) {
            return console.error(err)
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
                response.on('data', async (chunk) => {
                  file.size += chunk.length
                  file.percent = Math.floor((file.size/file.streamLength) * 100)
                })
                ws.on('finish', () => {
                  return next()
                })
                ws.on('error', (err) => {
                  console.error(err)
                })
                response.pipe(ws)
              }
              http.get(value, cb).on('error', (err) => {
                console.error(err)
              })
            }
          }
          next()
        })
      }
      http.get(`${payload.url}?ofd=raw`, cb).on('error', (err) => {
        console.error(err)
      })
    } else {
      let cb = (response) => {
        let ws = fs.createWriteStream(filename)
        ws.on('error', (err) => {
          console.error(err)
        })
        response.on('data', (chunk) => {
          file.size += chunk.length
          file.percent = Math.floor((file.size/file.streamLength) * 100)
          console.error(err)
        })
        response.pipe(ws)
      }
      http.get(payload.url, cb).on('error', (err) => {
        console.error(err)
      })
    }
  }
})()