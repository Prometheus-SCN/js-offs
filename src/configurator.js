const responder = require('electron-ipc-responder')

class rendererConfigurator extends responder {
  constructor (ipcRenderer, onError) {
    super(ipcRenderer.send.bind(ipcRenderer), ipcRenderer.on.bind(ipcRenderer))
    this.registerTopic('error', async (err) => onError(err))
  }
  async set (key, value) {
    return await this.ask('set', {key, value})
  }
  async get (key) {
    return await this.ask('get', {key})
  }
}

class mainConfigurator extends responder {
  constructor (webContents, ipcMain, getHandler, setHandler) {
    super(webContents.send.bind(webContents), ipcMain.on.bind(ipcMain))
    this.registerTopic('set', (payload) => {
      return  new Promise(async (resolve) => {
        try {
          await setHandler(payload)
          resolve(true)
        }
        catch (ex) {
          this.tell('error', ex.message)
          resolve(false)
        }
      })
    })
    this.registerTopic('get', (payload) => {
      return  new Promise(async (resolve) => {
        try {
          let value = await getHandler(payload)
          resolve(value)
        }
        catch (ex) {
          this.tell('error', ex.message)
          resolve(fa)
        }
      })
    })
  }
}


module.exports= {rendererConfigurator, mainConfigurator}