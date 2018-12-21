const responder = require('electron-ipc-responder')

class rendererUpdator extends responder {
  constructor (ipcRenderer, onError, onCheckingForUpdate, onUpdateAvailable, onUpdateNotAvailable, onDownloadProgress, onUpdatedDownloaded) {
    super(ipcRenderer.send.bind(ipcRenderer), ipcRenderer.on.bind(ipcRenderer))
    this.registerTopic('error', async (err) => onError(err))
    this.registerTopic('checking-for-update', async () => onCheckingForUpdate())
    this.registerTopic('update-available', async (info) => onUpdateAvailable(info))
    this.registerTopic('update-not-available', async (info) =>  onUpdateNotAvailable(info))
    this.registerTopic('download-progress', async (info) =>  onDownloadProgress(info))
    this.registerTopic('update-downloaded', async (info) =>  onUpdatedDownloaded(info))
  }

}
let _autoUpdater = new WeakMap()
class mainUpdator extends responder {
  constructor (webContents, ipcMain, autoUpdater, onComplete) {
    super(webContents.send.bind(webContents), ipcMain.on.bind(ipcMain))
    autoUpdater.autoDownload = false
    _autoUpdater.set(this, autoUpdater)
    autoUpdater.on('checking-for-update', () => {
      this.tell('checking-for-update')
    })
    autoUpdater.on('update-available', (info) => {
      this.tell('update-available', info)
      autoUpdater.downloadUpdate()
    })
    autoUpdater.on('update-not-available', (info) => {
      this.tell('update-not-available', info)
      setTimeout(onComplete, 2000)
    })
    autoUpdater.on('error', (err) => {
      this.tell('error', err)
      setTimeout(onComplete, 2000)
    })
    autoUpdater.on('download-progress', (info) => {
      this.tell('download-progress', info)
    })
    autoUpdater.on('update-downloaded', (info) => {
      this.tell('update-downloaded', info)
      setTimeout((() => autoUpdater.quitAndInstall()), 6000)
    })
  }
  checkForUpdatesAndNotify () {
    let autoUpdater = _autoUpdater.get(this)
    autoUpdater.checkForUpdatesAndNotify()
  }
}


module.exports= {rendererUpdator, mainUpdator}