let responder = require('electron-ipc-responder')

class rendererConnector extends responder {
  constructor (ipcRenderer, onError) {
    super(ipcRenderer.send.bind(ipcRenderer), ipcRenderer.on.bind(ipcRenderer))
    this.registerTopic('error', async (err) => onError(err))
  }
  async connect (locator) {
    await this.ask('connect', locator)
  }
}

class mainConnector extends responder {
  constructor (webContents, ipcMain, handler) {
    super(webContents.send.bind(webContents), ipcMain.on.bind(ipcMain))
    this.registerTopic('connect', (payload) => {
      return  new Promise(async (resolve, reject) => {
        try {
          await handler(payload)
          resolve(true)
        }
        catch (ex) {
          this.tell('error', ex.message)
          resolve(false)
        }
      })
    })
  }
}


module.exports= {rendererConnector, mainConnector}