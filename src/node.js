'use strict'
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events').EventEmitter
const natUpnp = require('nat-upnp')
const keypair = require('./keypair')
const Peer = require('./peer.js')
const config = require('../config.js')
const multihashing = require('multihashing')
const network = require('network')
const mkdirp = require('mkdirp')
const Messenger = require('udp-messenger')
const Bucket = require('./bucket')
const RPC = require('./rpc')
let _platformPath = new WeakMap()
let _applicationName = new WeakMap()
let _keyPair = new WeakMap()
let _peerInfo = new WeakMap()
let _client = new WeakMap()
let _messenger= new WeakMap()
const fileName = 'node.hhh'
module.exports = class Node extends EventEmitter {
  constructor (applicationName, putValue, getValue, pth) {
    super()
    if (typeof applicationName !== 'string') {
      throw new Error('Application name must be a string')
    }
    _applicationName.set(this, applicationName)
    if(pth){
      _platformPath.set(this, pth)
    }else {
      if (/^win/.test(process.platform)) {
        _platformPath.set(this, path.join(process.env[ 'SystemDrive' ], '/ProgramData/'))
      } else if (/^darwin/.test(process.platform)) {
        _platformPath.set(this, '/Library/Application Support/')
      } else {
        _platformPath.set(this, path.join(process.env[ 'HOME' ], '/'))
      }
    }
    let appFolder = path.join(_platformPath.get(this), applicationName)
    mkdirp(appFolder, (err)=> {
      if (err) {
        return this.emit(err)
      }
      let keyPair
      let node = fs.readFile(path.join(appFolder, 'node'), (err, node)=> {
        let getNetwork = (err)=> {
          if (err) {
            return this.emit('error', err)
          }

          let client = natUpnp.createClient()
          _client.set(this, client)
          process.nextTick(()=> {
            let getPeer = (err, ip)=> {
              let pk = keyPair.publicKey
              let id = multihashing(pk, 'sha2-256')
              let peerInfo=  new Peer(id, ip, port)
              _peerInfo.set(this, peerInfo)
              let messenger = new Messenger(config.timeout, port, config.packetSize)
              _messenger.set(this, messenger)
              let bucket = new Bucket(peerInfo.id, config.kbucketSize)
              let rpc = new RPC(peerInfo, messenger, bucket, getValue, putValue)
              messenger.listen()
              //this.emit('ready',  peerInfo)
              process.on('exit', ()=>{
                let messenger = _messenger.get(this)
                messenger.close(()=>{
                  let client = _client.get(this)
                  let peerInfo = _peerInfo.get(this)
                  client.client.portUnmapping({ public: peerInfo.port})
                })
              })
            }

            let port = config.startPort -1
            let tries = -1
            let getIp = (err, ip)=>{
              if(err){
                this.emit('error', err)
                network.get_private_ip(getPeer)
              }
              getPeer(err,'127.0.0.1')

            }
            let findPort = (err)=> {
              if (err || tries === -1) {
                tries++
                if (tries < config.numPortTries) {
                  port++
                  client.portMapping({
                    protocol:'udp',
                    public: port,
                    private: port,
                    ttl: 10
                  }, findPort)
                } else {
                  this.emit('error', new Error("Failed to configure UPnP port"))
                  port = config.startPort
                  client.externalIp(getIp)
                }
              } else{
                client.externalIp(getIp)
              }

            }
            findPort()
          })
        }
        if (err) {
           keypair.createKeypair((err, pair)=>{
             if(err){
               this.emit('error', err)
             }
             keyPair= pair
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

  }
}
