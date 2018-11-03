'use strict'
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events').EventEmitter
const natUpnp = require('nat-upnp')
const keypair = require('./keypair')
const Peer = require('./peer.js')
const config = require('./config')
const network = require('network')
const mkdirp = require('mkdirp')
const util = require('./utility')
const BlockRouter = require('./block-router')
const Server = require('./server')
const extIP = require('external-ip')()
let _platformPath = new WeakMap()
let _applicationName = new WeakMap()
let _keyPair = new WeakMap()
let _peerInfo = new WeakMap()
let _client = new WeakMap()
let _blockRouter = new WeakMap()
let _server = new WeakMap()
module.exports = class Node extends EventEmitter {
  constructor (applicationName, pth) {
    super()
    if (typeof applicationName !== 'string') {
      throw new Error('Application name must be a string')
    }
    _applicationName.set(this, applicationName)
    if (pth) {
      _platformPath.set(this, pth)
    } else {
      if (/^win/.test(process.platform)) {
        _platformPath.set(this, path.join(process.env[ 'SystemDrive' ], 'ProgramData', '.offs'))
      } else {
        _platformPath.set(this, path.join(process.env[ 'HOME' ], '.offs'))
      }
    }
    let appFolder = path.join(_platformPath.get(this), applicationName)
    let err = config.load(appFolder)
    if (err) {
      config.loadDefaults()
      config.save(appFolder)
    }
    // To keep release versions consistent
    if (!config.cacheLocation) {
        config.cacheLocation = appFolder
    }
    process.nextTick(() => {
      mkdirp(appFolder, (err)=> {
        if (err) {
          return this.emit(err)
        }
        let keyPair
        let node = fs.readFile(path.join(appFolder, 'node'), (err, node)=> {
          let getNetwork = (err) => {
            if (err) {
              return this.emit('error', err)
            }
            let client = natUpnp.createClient()
            _client.set(this, client)

            let getPeer = (err, ip)=> {
              if (err) {
                this.emit('error', err)
                ip = '127.0.0.1'
              }
              let pk = keyPair.publicKey
              let id = util.hash(pk)
              let peerInfo = new Peer(id, ip, port)
              _peerInfo.set(this, peerInfo)
              Peer.self = peerInfo
              let blockRouter = new BlockRouter(config.cacheLocation, peerInfo)
              _blockRouter.set(this, blockRouter)
              blockRouter.on('error', (err) => this.emit('error', err))
              let server = Server(blockRouter, this.emit.bind(this))
              _server.set(this, server)
              server.listen(config.httpPort, () => {
                this.emit('listening', config.httpPort)
              })
              blockRouter.listen()

              this.emit('ready',  peerInfo)
              process.on('exit', ()=> {
                let client = _client.get(this)
                let peerInfo = _peerInfo.get(this)
                client.portUnmapping({ public: peerInfo.port })
              })
              this.blockRouter.bootstrap(() => this.emit('bootstrapped', blockRouter.connections))
            }

            let port = config.startPort - 1
            let tries = -1
            let getIp = (err, ip)=> {
              if (err) {
                this.emit('error', err)
                return network.get_private_ip(getPeer)
              } else {
                return getPeer(null, ip)
              }
            }
            let findPort = (err)=> {
              /*
               if (err || tries === -1) {
               tries++
               if (tries < config.numPortTries) {
               port++
               client.portMapping({
               protocol: 'tcp',
               public: port,
               private: port,
               ttl: 10
               }, findPort)
               } else {
               this.emit('error', new Error('Failed to configure UPnP port'))
               port = config.startPort
               client.externalIp(getIp)
               }
               } else {
               client.externalIp(getIp)
               }
               */
              port = config.startPort
              if (config.internalIP) {
                return getIP(new Error('Using Internal IP'))
              } else {
                return extIP(getIp)
              }
            }
            findPort()
          }
          if (err) {
            keypair.createKeypair((err, pair)=> {
              if (err) {
                this.emit('error', err)
              }
              keyPair = pair
              _keyPair.set(this, keyPair)
              let node = pair.marshal()
              fs.writeFile(path.join(appFolder, 'node'), node, getNetwork)
            })

          } else {
            keyPair = keypair.unmarshal(node)
            if (keyPair) {
              _keyPair.set(this, keyPair)
              getNetwork()
            } else {
              this.emit('error', new Error('Invalid node key pair'))
            }
          }
        })
      })
    })
  }

  get blockRouter () {
    return _blockRouter.get(this)
  }

  get peerInfo () {
    return _peerInfo.get(this)
  }
  get path () {
    return _platformPath.get(this)
  }

}
