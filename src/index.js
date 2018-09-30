const { app, Menu, MenuItem, Tray, BrowserWindow, clipboard } = require('electron')
const path = require('path')
const url = require('url')
const Node = require('./node')
const config = require('./config')
const { ipcMain } = require('electron')
const icon = path.join(__dirname, 'electron', 'images', 'off-logo.png')
const trayIcon = path.join(__dirname, 'electron', 'images', 'off-logo16x16.png')
const Exporter = require('./exporter').mainExporter
const Connector = require('./connector').mainConnector
const Configurator = require('./configurator').mainConfigurator
const Peer = require('./peer')
const bs58 = require('bs58')
//const devTools = require('vue-devtools')

const log = require('js-logging')
  .console({
    filters: {
      debug: 'white',
      info: 'yellow',
      notice: 'green',
      warning: 'blue',
      error: 'red',
      critical: 'red',
      alert: 'cyan',
      emergency: 'magenta'
    }
  })
let win
let node

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

if (shouldQuit) {
  app.quit()
}

function createTray () {
  /*if (process.env.NODE_ENV === 'development') {
    devTools.install()
  }*/
  node = new Node('OFFSYSTEM')
  node.on('error', log.error)
  node.on('bootstrapped', (connections) => log.notice(`Boostrapped with ${connections} connections`))
  node.on('ready', () => log.notice(`Node ${node.peerInfo.key} is online at ${node.peerInfo.ip} and port ${node.peerInfo.port}`))
  node.on('listening', (port) => log.notice(`HTTP Server is online at ${node.peerInfo.ip} and port ${port}`))
  node.once('ready', () => {
    let importWin
    let createImportWin = () => {
      let width
      let height
      if (/^win/.test(process.platform)) {
        width = 530
        height = 332
      } else {
        width = 530
        height = 304
      }
      importWin = new BrowserWindow({ width, height, icon: icon, autoHideMenuBar:true, resizable: true})
      importWin.on('close', (e) => {
        e.preventDefault()
        importWin.hide()
      })
      importWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'import', 'index.html')}`)
      //importWin.webContents.openDevTools({})
    }
    let openImportWin = () => {
      if (importWin) {
        importWin.show()
      } else {
        createImportWin()
      }
    }
    let exportWin
    let exporter
    let hideExportWin = () => {
      exportWin.hide()
    }

    let createExportWin = () => {
      exportWin = new BrowserWindow({ width: 525, height: 304, icon: icon, autoHideMenuBar:true, resizable: true})
      exportWin.on('close', (e) => {
        e.preventDefault()
        exportWin.hide()
      })
      //exportWin.on('blur', hideExportWin)
      //exportWin.webContents.openDevTools({})
    }
    let openExportWin = () => {
      if (exportWin) {
        exportWin.show()
      } else {
        createExportWin()
        exporter =  new Exporter(exportWin.webContents, ipcMain)
      }
      exportWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'export', 'index.html')}`)
    }
    let connectWin
    let connector
    let createConnectWin = () => {
      let width
      let height
      if (/^win/.test(process.platform)) {
        width = 800
        height = 186
      } else {
        width = 800
        height = 126
      }
      connectWin = new BrowserWindow({ width, height, icon: icon, autoHideMenuBar:true, resizable: false})
      connectWin.on('close', (e) => {
        e.preventDefault()
        connectWin.hide()
      })

      connectWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'connect', 'index.html')}`)
      //connectWin.webContents.openDevTools({})
    }

    let openConnectWin = () => {
      if (connectWin) {
        connectWin.show()
      } else {
        createConnectWin()
        connector = new Connector(connectWin.webContents, ipcMain , (payload) => {
          return new Promise((resolve, reject) => {
            let peer
            try {
              payload.id = new Buffer(bs58.decode(payload.id))
              let peer = Peer.fromJSON(payload)
              node.blockRouter.connect(peer, (err) => {
                if (err){
                  return reject(err)
                } else{
                  return resolve()
                }
              })
            } catch (ex) {
              reject(ex)
            }
          })
        })
      }
    }
    let configurationWin
    let configurator
    let createConfigurationWin = () => {
      configurationWin = new BrowserWindow({ width: 900, height: 900, icon: icon, autoHideMenuBar:true })
      configurationWin.on('close', (e) => {
        e.preventDefault()
        configurationWin.hide()
      })
      configurationWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'configuration', 'index.html')}`)
     // configurationWin.webContents.openDevTools({})
      let setHandler = async (payload) => {
        config[payload.key] = payload.value
      }
      let getHandler = async (payload) => {
        return config[payload.key]
      }
      let resetHandler = () => {
        app.relaunch()
        app.exit(0)
      }
      configurator = new Configurator(configurationWin.webContents, ipcMain, getHandler, setHandler, resetHandler)
    }
    let openConfigurationWin = () => {
      if (configurationWin) {
        configurationWin.show()
      } else {
        createConfigurationWin()
      }
    }
    let copyNodeId = () => {
      clipboard.writeText(node.peerInfo.key)
    }

    tray = new Tray(trayIcon)
    let nodeItem = new MenuItem({ label: `Node: ${node.peerInfo.key}`, type: 'normal', click: copyNodeId })
    let connectionsItem = new MenuItem({ label: `Connections: ${node.blockRouter.connections}`, type: 'normal' })
    let blockCapacityItem = new MenuItem({
      label: `Block Cache Capacity: ${node.blockRouter.blockCapacity}%`,
      type: 'normal'
    })
    let miniCapacityItem = new MenuItem({
      label: `Mini Cache Capacity: ${node.blockRouter.miniCapacity}%`,
      type: 'normal'
    })
    let nanoCapacityItem = new MenuItem({
      label: `Nano Cache Capacity: ${node.blockRouter.nanoCapacity}%`,
      type: 'normal'
    })
    let importItem = new MenuItem({ label: 'Import', type: 'normal', click: openImportWin })
    let exportItem = new MenuItem({ label: 'Export', type: 'normal', click: openExportWin })
    let configItem = new MenuItem({ label: 'Configuration', type: 'normal', click: openConfigurationWin })
    let connectItem = new MenuItem({ label: 'Connect to Peer', type: 'normal', click: openConnectWin })
    let exitItem = new MenuItem({ label: 'Exit', type: 'normal', click: () => app.exit() })
    let contextMenu = new Menu()
    contextMenu.append(nodeItem)
    contextMenu.append(connectionsItem)
    contextMenu.append(new MenuItem({ label: '', type: 'separator' }))
    contextMenu.append(blockCapacityItem)
    contextMenu.append(miniCapacityItem)
    contextMenu.append(nanoCapacityItem)
    contextMenu.append(new MenuItem({ label: '', type: 'separator' }))
    contextMenu.append(importItem)
    contextMenu.append(exportItem)
    contextMenu.append(configItem)
    contextMenu.append(connectItem)
    contextMenu.append(new MenuItem({ label: '', type: 'separator' }))
    contextMenu.append(exitItem)
    tray.setToolTip('Off System')
    tray.setContextMenu(contextMenu)
    let rebuildMenu = (cache, capacity)=> {
      switch (cache) {
        case config.block:
          contextMenu.items[ 3 ].label = `Block Cache Capacity: ${capacity.toPrecision(3)}%`
          break;
        case config.mini:
          contextMenu.items[ 4 ].label = `Mini Cache Capacity: ${capacity.toPrecision(3)}%`
          break;
        case config.nano:
          contextMenu.items[ 5].label = `Nano Cache Capacity: ${capacity.toPrecision(3)}%`
          break;
      }
      let tempMenu = new Menu()
      contextMenu.items.forEach((item)=> {
        tempMenu.append(item)
      })
      contextMenu = tempMenu
      tray.setContextMenu(contextMenu)
    }

    let rebuildMenuConnection = (connections)=> {
      contextMenu.items[ 1 ].label = `Connections: ${connections}`
      let tempMenu = new Menu()
      contextMenu.items.forEach((item)=> {
        tempMenu.append(item)
      })
      contextMenu = tempMenu
      tray.setContextMenu(contextMenu)
    }

    node.blockRouter.on('capacity', rebuildMenu)
    node.blockRouter.on('connection', rebuildMenuConnection)
    //TODO Create full notification
    node.blockRouter.on('full', (cache) => {
      switch (cache) {
        case config.block:
          //win.webContents.send('blockFull', capacity)
          break;
        case config.mini:
          //win.webContents.send('miniFull', capacity)
          break;
        case config.nano:
          //win.webContents.send('nanoFull', capacity)
          break;
      }
    })
  })
}

app.on('ready', createTray)

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})
