const { app, Menu, MenuItem, Tray, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')
const Node = require('./node')
const config = require('./config')
const { ipcMain } = require('electron')
const icon = path.join(__dirname, 'electron', 'images', 'off-logo.png')
let win
let node
/*
 let opts = {}
 opts.dir = path.join(__dirname, 'electron')
 opts.width = 500
 opts.height = 226
 opts.icon = path.join(__dirname, 'electron','images', 'off-logo.png')
 let mb = menubar()
 mb.on('ready', function ready () {
 console.log('app is ready')
 // your app code here
 })*/

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
  //win = new BrowserWindow({width:900, height: 226})
  let windowPosition = (process.platform === 'win32') ? 'trayBottomCenter' : 'trayCenter'
  node = new Node('OFFSYSTEM', '../offsystem')
  node.on('error', console.log)
  node.on('bootstrapped',() => console.log('boostrapped'))
  node.once('ready', () => {
    let statusWin
    let hideStatusWin = () => {
      statusWin.hide()
    }
    let createStatusWin = () => {
      statusWin = new BrowserWindow({ width: 900, height: 226, icon: icon })
      statusWin.on('blur', hideStatusWin)
      statusWin.loadURL(`file://${path.join(__dirname, 'electron','views','status', 'index.html')}`)
    }
    let openStatusWin = () => {
      if (statusWin) {
        statusWin.show()
      } else {
        createStatusWin()
      }
    }
    let importWin
    let hideImportWin = () => {
      importWin.hide()
    }
    let createImportWin = () => {
      importWin = new BrowserWindow({ width: 530, height: 270, icon: icon})
      importWin.on('close', (e) => {
        e.preventDefault()
        importWin.hide()
      })
      // importWin.setResizable(false)
      importWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'import', 'index.html')}`)
      // importWin.webContents.openDevTools({})
    }
    let openImportWin = () => {
      if (importWin) {
        importWin.show()
      } else {
        createImportWin()
      }
    }
    let exportWin
    let hideExportWin = () => {
      hideExportWin.hide()
    }
    let createExportWin = () => {
      exportWin = new BrowserWindow({ width: 900, height: 226, icon: icon })
      exportWin.on('blur', hideExportWin)
      exportWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'export','export.html')}`)
    }
    let openExportWin = () => {
      if (exportWin) {
        exportWin.show()
      } else {
        createExportWin()
      }
    }
    let connectWin
    let hideConnectWin = () => {
      hideConnectWin.hide()
    }
    let createConnectWin = () => {
      connectWin = new BrowserWindow({ width: 900, height: 226, icon: icon })
      connectWin.on('blur', hideConnectWin)
      connectWin.loadURL(`file://${path.join(__dirname, 'electron', 'views', 'connect','connect.html')}`)
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
    let cacheItem = new MenuItem({ label: 'Cache Status', type: 'normal', click: () => openStatusWin() })
    let configItem = new MenuItem({ label: 'Configuration', type: 'normal', click: () => openConnectWin() })
    let connectItem = new MenuItem({ label: 'Connect to Peer', type: 'normal', click: () => openConnectWin() })
    let exitItem = new MenuItem({ label: 'Exit', type: 'normal', click: () => app.exit() })
    let contextMenu = new Menu()
    contextMenu.append(nodeItem)
    contextMenu.append(new MenuItem({ label: '', type: 'separator' }))
    contextMenu.append(blockCapacityItem)
    contextMenu.append(miniCapacityItem)
    contextMenu.append(nanoCapacityItem)
    contextMenu.append(new MenuItem({ label: '', type: 'separator' }))
    contextMenu.append(importItem)
    contextMenu.append(exportItem)
    contextMenu.append(cacheItem)
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
  /*
   win.on('closed', () => {
   win = null
   node = null
   })
   win.webContents.openDevTools()
   */
}

app.on('ready', createWindow)

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})
