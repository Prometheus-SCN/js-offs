const { app, Menu, MenuItem, Tray, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')
const Node = require('./node')
const config = require('./config')
const { ipcMain } = require('electron')
const icon = path.join(__dirname, 'electron', 'images', 'off-logo.png')
const Exporter = require('./exporter').mainExporter
let Responder = require('electron-ipc-responder')
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

function createWindow () {
  node = new Node('OFFSYSTEM')
  node.on('error', log.error)
  node.on('bootstrapped', (connections) => log.notice(`Boostrapped with ${connections} connections`))
  node.on('ready', () => log.notice(`Node ${node.peerInfo.key} is online at ${node.peerInfo.ip} and port ${node.peerInfo.port}`))
  node.on('listening', (port) => log.notice(`HTTP Server is online at ${node.peerInfo.ip} and port ${port}`))
  node.once('ready', () => {
    let importWin
    let createImportWin = () => {
      importWin = new BrowserWindow({ width: 530, height: 255, icon: icon, autoHideMenuBar:true, resizable: true })
      importWin.on('close', (e) => {
        e.preventDefault()
        importWin.hide()
      })
      importWin.setResizable(false)
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
      exportWin = new BrowserWindow({ width: 525, height: 128, icon: icon, autoHideMenuBar:true, resizable: false})
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
      connectWin = new BrowserWindow({ width: 900, height: 226, icon: icon })
      connectWin.on('close', (e) => {
        e.preventDefault()
        connectWin.hide()
      })
      connectWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'connect', 'index.html')}`)
      connectWin.webContents.openDevTools({})
      connector = new Responder(connectWin.webContent.send.bind(connectWin.webContent), connectWin.webContent.on.bind(connectWin.webContent))
    }

    let openConnectWin = () => {
      if (connectWin) {
        connectWin.show()
      } else {
        createConnectWin()
      }
    }
    let configurationWin
    let hideConfigurationWin = () => {
      configurationWin.hide()
    }
    let createConfigurationWin = () => {
      configurationWin = new BrowserWindow({ width: 900, height: 226, icon: icon })
      configurationWin.on('blur', hideConfigurationWin)
      configurationWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'configuration', 'configuration.html')}`)
    }
    let openConfigurationWin = () => {
      if (configurationWin) {
        configurationWin.show()
      } else {
        createConfigurationWin()
      }
    }

    tray = new Tray(icon)
    let nodeItem = new MenuItem({ label: `Node: ${node.peerInfo.key}`, type: 'normal' })
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
    let importItem = new MenuItem({ label: 'Import', type: 'normal', click: () => openImportWin() })
    let exportItem = new MenuItem({ label: 'Export', type: 'normal', click: () => openExportWin() })
    let configItem = new MenuItem({ label: 'Configuration', type: 'normal', click: () => openConfigurationWin })
    let connectItem = new MenuItem({ label: 'Connect to Peer', type: 'normal', click: () => openConnectWin() })
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
          contextMenu.items[ 2 ].label = `Block Cache Capacity: ${capacity.toPrecision(3)}%`
          break;
        case config.mini:
          contextMenu.items[ 3 ].label = `Mini Cache Capacity: ${capacity.toPrecision(3)}%`
          break;
        case config.nano:
          contextMenu.items[ 4 ].label = `Nano Cache Capacity: ${capacity.toPrecision(3)}%`
          break;
      }
      let tempMenu = new Menu()
      contextMenu.items.forEach((item)=> {
        tempMenu.append(item)
      })
      contextMenu = tempMenu
      tray.setContextMenu(contextMenu)
    }

    node.blockRouter.on('capacity', rebuildMenu)
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

app.on('ready', createWindow)

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})
