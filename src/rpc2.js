'use strict'
const Peer = require('./peer')
const Bucket = require('./bucket')
const ExpirationMap = require('./expiration-map')
const ws = require('ws')
const ScalableCuckoo = require('cuckoo-filter').ScalableCuckooFilter
const Cuckoo = require('cuckoo-filter').CuckooFilter
const util = require('./utility')
const config = require('./config')
const protobuf = require('protobufjs')
const EventEmitter = require('events').EventEmitter
const crypto = require('crypto')
const increment = require('increment-buffer')
const equal = require('buffer-equal')
const path = require('path')
const file = path.join(__dirname, '/proto/', 'rpc.proto')
const builder = protobuf.loadProtoFile(file)
const RPCProto = builder.build('RPCProto')
const FindNodeRequest = RPCProto.FindNodeRequest
const FindNodeResponse = RPCProto.FindNodeResponse
const FindValueRequest = RPCProto.FindValueRequest
const FindValueResponse = RPCProto.FindValueResponse
const PingStorageResponse = RPCProto.PingStorageResponse
const StoreRequest = RPCProto.StoreRequest
const RandomRequest = RPCProto.RandomRequest
const RandomResponse = RPCProto.RandomResponse
const PingValueRequest = RPCProto.PingValueRequest
const PingStorageRequest = RPCProto.PingStorageRequest
const RPCType = RPCProto.RPCType
const Direction = RPCProto.Direction
const Status = RPCProto.Status

let _peer = new WeakMap()
let _rpcid = new WeakMap()
let _bucket = new WeakMap()
let _rpcInterface = new WeakMap()
let _server = new WeakMap()
let _port = new WeakMap()
let _onError = new WeakMap()
let _onConnection = new WeakMap()
let _peerSocks = new WeakMap()
let _getSocket = new WeakMap()

module.exports = class RPC2 extends EventEmitter {
  constructor (peer, bucket, rpcInterface) {
    super()
    if (!(peer instanceof Peer)) {
      throw new TypeError('Invalid Peer')
    }
    if (!(bucket instanceof Bucket)) {
      throw new TypeError('Invalid Bucket')
    }
    if (!rpcInterface) {
      throw new TypeError('Invalid RPC Interface')
    }
    _port.set(this, peer.port)
    _bucket.set(this, bucket)
    _peer.set(this, peer)
    _rpcInterface.set(this, rpcInterface)
    _rpcid.set(this, crypto.randomBytes(2))
    _peerSocks.set(this, new ExpirationMap(60 * 1000))
    let pingResponse = (pb, socket)=> {
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      responsepb.status = Status.Success
      let response = new RPCProto.RPC(responsepb).encode().toBuffer()
      let msg = RPCProto.RPC.decode(response)
      socket.send(response)
    }
    let findNodeResponse = (pb, socket)=> {
      let nodepb = FindNodeRequest.decode(pb.payload)
      sanitizeFindNodeRequest(nodepb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      let peers = bucket.closest(nodepb.id, nodepb.count)
      let peerspb = peers.map((peer)=> {return peer.toJSON()})
      let payload = FindNodeResponse.encode({ nodes: peerspb })
      responsepb.payload = payload
      responsepb.status = Status.Success
      let response = new RPCProto.RPC(responsepb).encode().toBuffer()
      socket.send(response)
    }
    let findValueResponse = (pb, socket)=> {
      let valuepb = FindValueRequest.decode(pb.payload)
      sanitizeValueRequest(valuepb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      rpcInterface.getValue(valuepb.hash, valuepb.type, (err, value)=> {
        if (err) {
          let peers = bucket.closest(valuepb.hash, valuepb.count)
          peers = peers.map((peer)=> { return peer.toJSON()})
          let valueRespb = { hash: valuepb.hash, type: valuepb.type, nodes: peers }
          let payload = new FindValueResponse(valueRespb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Failure
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.send(response)
        } else {
          let valueRespb = { hash: valuepb.hash, data: value, type: valuepb.type, nodes: [] }
          let payload = new FindValueResponse(valueRespb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Success
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.send(response)
        }
      })
    }
    //save data
    let storeResponse = (pb, socket) => {
      let storepb = StoreRequest.decode(pb.payload)
      sanitizeStoreRequest(storepb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      rpcInterface.storeValue(storepb.value, storepb.type, (err) => {
        if (err) {
          responsepb.status = Status.Failure
        } else {
          responsepb.status = Status.Success
        }
        let response = new RPCProto.RPC(responsepb).encode().toBuffer()
        socket.send(response)
      })
    }
    let randomResponse = (pb, socket) => {
      let randompb = RandomRequest.decode(pb.payload)
      sanitizeRandomRequest(randompb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      let type = randompb.type
      rpcInterface.closestBlock(pb.from.id, Cuckoo.fromCBOR(randompb.filter), randompb.type, (err, block)=> {
        if (err) {
          responsepb.status = Status.Failure
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.end(response)
        } else {
          let randompb = { type: type, value: block.data }
          let payload = new RandomResponse(randompb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Success
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.send(response)
        }
      })
    }
    let pingValueResponse = (pb, socket) => {
      let pingvaluepb = PingValueRequest.decode(pb.payload)
      sanitizePingValueRequest(pingvaluepb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      rpcInterface.containsValue(pingvaluepb.hash, pingvaluepb.type, (contains) => {
        responsepb.status = contains ? Status.Success : Status.Failure
        let response = new RPCProto.RPC(responsepb).encode().toBuffer()
        socket.send(response)
      })
    }
    let pingStorageResponse = (pb, socket) => {
      let pingstoragepb = PingStorageRequest.decode(pb.payload)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      responsepb.status = Status.Success
      let type = pingstoragepb.type
      pingstoragepb = {}
      pingstoragepb.capacity = rpcInterface.storageCapacity(type)
      let payload = new PingStorageResponse(pingstoragepb).encode().toBuffer()
      responsepb.payload = payload
      let response = new RPCProto.RPC(responsepb).encode().toBuffer()
      socket.send(response)
    }
    let onMessage = (socket, msg) => {
      try {
        let pb = RPCProto.RPC.decode(msg)
        sanitizeRPC(pb)
        let bucket = _bucket.get(this)
        let peer = Peer.fromJSON(pb.from)
        bucket.add(peer)
        let peerSocks = _peerSocks.get(this)
        if (!peerSocks.get(peer.key)) {
          peerSocks.set(peer.key, socket)
          let onExpire = (socket) => {
            socket.close()
          }
          socket.on('closed', () => {
            peerSocks.removeEventListener(peer.key, onExpire)
            peerSocks.delete(peer.key)
          })

          peerSocks.once(peer.key, onExpire)
        }
        if (pb.comType === Direction.Request) {
          switch (pb.type) {
            case RPCType.Ping :
              pingResponse(pb, socket)
              break;
            case RPCType.Find_Node :
              findNodeResponse(pb, socket)
              break;
            case RPCType.Find_Value :
              findValueResponse(pb, socket)
              break;
            case RPCType.Store :
              storeResponse(pb, socket)
              break;
            case RPCType.Random :
              randomResponse(pb, socket)
              break;
            case RPCType.Ping_Value :
              pingValueResponse(pb, socket)
              break;
            case RPCType.Ping_Storage :
              pingStorageResponse(pb, socket)
              break;
          }
        } else {
          socket.emit(pb.id.toString('hex'), pb)
        }
      } catch (err) {
        return this.emit('error', err)
      }
    }

    let onError = (err) => {
      this.emit('error', err)
    }
    _onError.set(this, onError)
    let newSocket = (socket, peer, cb) => {
      if (typeof peer == 'function') {
        cb = peer
        peer = undefined
      }
      if (socket instanceof Peer) {
        peer = socket
        socket = undefined
      }

      if(!socket) {
        socket = new ws(`ws://${peer.ip}:${peer.port}`)
        let peerSocks = _peerSocks.get(this)
        let onExpire = (socket) => {
          socket.close()
        }
        let openErr = (err) => cb(err)
        socket.once('error', openErr)
        socket.on('open', () => {
          socket.removeEventListener('error', openErr)
          peerSocks.set(peer.key, socket)
          peerSocks.once(peer.key, onExpire)
          return cb(null, socket)
        })

        socket.on('closed', () => {
          peerSocks.removeEventListener(peer.key, onExpire)
          peerSocks.delete(peer.key)
        })
      }
      socket.on('error', onError)
      socket.on('message', (data) => onMessage (socket, data))
    }
    let getSocket = (peer, cb) => {
      let peerSocks = _peerSocks.get(this)
      let socket = peerSocks.get(peer.key)
      if (!socket) {
        newSocket(peer, cb)
      } else {
        if (socket.readyState === 1) {
          return cb(null, socket)
        } else if (socket.readyState === 2 || socket.readyState === 3) {
          return cb(new Error('Connection Closed'))
        }
      }
    }
    _getSocket.set(this, getSocket)

    let onConnection = (socket) => {
      return newSocket(socket, () => {})
    }
    _onConnection.set(this, onConnection)
  }

  get rpcid () {
    let current = _rpcid.get(this).slice(0)
    let rpcid = current
    rpcid = increment(current)
    _rpcid.set(this, rpcid)
    return current
  }

  listen () {
    let server = _server.get(this)
    if (server) {
      this.close()
    }
    let port = _port.get(this)
    let onError =  _onError.get(this)
    let onConnection = _onConnection.get(this)
    server = new ws.Server({port})
    server.on('error', onError)
    server.on('listening', () => this.emit('listening'))
    server.on('connection', onConnection)
    _server.set(this, server)
  }

  close (cb) {
    let peerSocks = _peerSocks.get(this)
    for (socket of peerSocks.values()) {
      socket.close()
    }
    let server = _server.get(this)
    server.close(cb)
    _server.set(this, undefined)
  }

  findNode (id, cb) {
    let peer = _peer.get(this)
    let getSocket = _getSocket.get(this)
    let bucket = _bucket.get(this)
    if (!bucket.count) {
      return cb(new Error('No Peers Connected'))
    }
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Find_Node
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let findnodepb = {}
    findnodepb.id = id
    findnodepb.count = config.nodeCount

    let payload = new FindNodeRequest(findnodepb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    let nodes = bucket.closest(id, bucket.count)
    let nodeBucket = new Bucket(peer.id, config.kbucketSize)
    for (let i = 0; i < nodes.length; i++) {
      nodeBucket.add(nodes[ i ])
    }
    let queried = new ScalableCuckoo(config.filterSize, config.bucketSize, config.fingerprintSize, config.scale)
    let i = 0
    let next = () => {
      if (nodeBucket.count > 0 && i < config.nodeCount) {
        let to = nodeBucket.closest(id, 1).shift()
        queried.add(to.id)
        nodeBucket.remove(to)
        getSocket(to, (err, socket) => {
          if (err) {
            return next
          }
          let onErr = () => {
            return next()
          }
          socket.once('error', onErr)
          socket.once(requestpb.id.toString('hex'), (pb) => {
            try {
              socket.removeEventListener('error', onErr)
              i++
              let nodespb = FindNodeResponse.decode(pb.payload)
              let thisNode = peer
              nodespb.nodes.forEach((peer)=> {
                sanitizePeer(peer)
                if (peer.id.equals(thisNode.id)) {
                  return
                }
                peer = Peer.fromJSON(peer)
                if (!queried.contains(peer.id)) {
                  nodeBucket.add(peer)
                }
                bucket.add(peer)
              })
              return next()
            } catch (err) {
              return next()
            }
          })
          socket.send(request)
        })
      } else {
        return cb()
      }
    }
    next()
  }

  findValue (hash, type, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let getSocket = _getSocket.get(this)
    if (!bucket.count) {
      return cb(new Error('No Peers Connected'))
    }
    let rpcInterface = _rpcInterface.get(this)
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Find_Value
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let findvaluepb = {}
    findvaluepb.hash = hash
    findvaluepb.count = config.nodeCount
    findvaluepb.type = type
    let payload = new FindValueRequest(findvaluepb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()

    let nodes = bucket.closest(hash, bucket.count)
    let nodeBucket = new Bucket(peer.id, config.kbucketSize)
    for (let i = 0; i < nodes.length; i++) {
      nodeBucket.add(nodes[ i ])
    }
    let queried = new ScalableCuckoo(config.filterSize, config.bucketSize, config.fingerprintSize, config.scale)
    let next = () => {
      if (nodeBucket.count > 0) {
        let to = nodeBucket.closest(hash, 1).shift()
        queried.add(to.id)
        nodeBucket.remove(to)
        getSocket(to, (err, socket) => {
          if (err) {
            return next()
          }
          let onErr = (err) => {
            return next()
          }
          socket.once(requestpb.id.toString('hex'), (pb) => {
            socket.removeEventListener('error', onErr)
            try {
              let valuespb = FindValueResponse.decode(pb.payload)
              sanitizeValueResponse(valuespb)
              if (valuespb.data) {
                return rpcInterface.storeValue(valuespb.data, valuespb.type, hash, (err, block) => {
                  if (err) {
                    return cb(err)
                  }
                  return cb(err, block)
                })
              } else {
                let thisNode = _peer.get(this)
                valuespb.nodes.forEach((peer)=> {
                  sanitizePeer(peer)
                  if (peer.id.equals(thisNode.id)) {
                    return
                  }
                  peer = Peer.fromJSON(peer)
                  if (!queried.contains(peer.id)) {
                    nodeBucket.add(peer)
                  }
                  bucket.add(peer)
                })
                return next()
              }
            } catch (err) {
              return cb(err)
            }
          })
          socket.once('error', onErr)
          socket.send(request)

        })
      }
    }
    next()
  }

  ping (id, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let getSocket = _getSocket.get(this)
    let to = bucket.get(id)
    if (!to) {
      return cb(new Error('Peer not found'))
    }
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Ping
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    getSocket(to, (err, socket) => {
      if (err) {
        return cb(err)
      }
      let onErr = (err) => {
        return cb(err)
      }
      socket.once(requestpb.id.toString('hex'), (pb) => {
        socket.removeEventListener('error', onErr)
        try {
          if (pb.Status === Status.Sucess) {
            return cb()
          } else {
            return cb(new Error('Ping Failed'))
          }
        } catch (err) {
          return cb(err)
        }
      })
      socket.once('error', onErr)
      socket.send(request)
    })
  }

  store (hash, type, value, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let getSocket = _getSocket.get(this)
    if (!bucket.count) {
      return cb(new Error('No Peers Connected'))
    }
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Store
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let storepb = {}
    storepb.type = type
    storepb.value = value
    let payload = new StoreRequest(storepb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    // Determine current redundancy percentage for connected peers
    let redundancy = Math.floor(bucket.count * config.redundancy)
    redundancy = (redundancy < 1 && bucket.count > 1) ? 1 : redundancy
    let nodes = bucket.closest(hash, redundancy + config.kbucketSize)
    let nodeBucket = new Bucket(peer.id, config.kbucketSize)
    for (let i = 0; i < nodes.length; i++) {
      nodeBucket.add(nodes[ i ])
    }
    let i = 0
    let next = () => {
      if (nodeBucket.count > 0) {
        let to = nodeBucket.closest(hash, 1).shift()
        nodeBucket.remove(to)
        getSocket(to, (err, socket) => {
          if (err) {
            return next()
          }
          let onErr = () => {
            return next()
          }
          socket.once(requestpb.id.toString('hex'), (pb) => {
            socket.removeEventListener('error', onErr)
            try {
              if (pb.status == Status.Success && i++ && i >= redundancy) {
                return cb()
              } else {
                return next()
              }
            } catch (err) {
              return next()
            }
          })
          socket.once('error', onErr)
          socket.send(request)
        })
      } else if (i < redundancy) {
        return cb(new Error('Value Not Stored'))
      } else {
        return cb()
      }
    }
    next()
  }

  random (count, type, filter, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let getSocket = _getSocket.get(this)
    if (!bucket.count) {
      return cb(new Error('No Peers Connected'))
    }
    let requestpb = {}
    let rpcInterface = _rpcInterface.get(this)
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Random
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let randompb = {}
    randompb.type = type
    randompb.filter = filter.toCBOR()
    let payload = new RandomRequest(randompb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    let nodes = bucket.closest(peer.id, bucket.count)
    let i = 0
    let next = () => {
      if (nodes.length > 0 && i < count) {
        let index = util.getRandomInt(0, nodes.length - 1)// random selection of nodes to ask
        let to = nodes.splice(index, 1)[ 0 ]
        getSocket(to, (err, socket) => {
          if (err) {
            return next()
          }
          let onErr = (err) => {
            return next()
          }
          socket.once(requestpb.id.toString('hex'), (pb) => {
            socket.removeEventListener('error', onErr)
            try {
              if (pb.status == Status.Success) {
                let randompb = RandomResponse.decode(pb.payload)
                sanitizeRandomResponse(randompb)
                if (randompb.value) {
                  rpcInterface.storeValue(randompb.value, randompb.type, (err) => {
                    if (!err) {
                      i++
                    }
                    return next()
                  })
                }
              } else {
                return next()
              }
            } catch (err) {
              return next()
            }
          })
          socket.once('error', onErr)
          socket.send(request)
        })
      } else if (i < count) {
        return cb(new Error('Failed To Retrieve Random'))
      } else {
        return cb()
      }
    }
    next()
  }

  connect (peer, cb) {
    let bucket = _bucket.get(this)
    bucket.add(peer)
    this.ping(peer.id, (err)=> {
      if (err) {
        bucket.remove(peer)
        return cb(new Error('Failed to connect'))
      }
      return cb()
    })
  }

  pingValue (id, hash, type, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let getSocket = _getSocket.get(this)
    if (!bucket.count) {
      return cb(new Error('No Peers Connected'))
    }
    let to = bucket.get(id)
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Ping_Value
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let pingvaluepb = {}
    pingvaluepb.type = type
    pingvaluepb.hash = hash
    requestpb.payload = new PingValueRequest(pingvaluepb).encode().toBuffer()
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    getSocket(to, (err, socket) =>{
      if (err) {
        return cb(err)
      }
      let onErr = (err) => {
        return cb(err)
      }
      socket.once(requestpb.id.toString('hex'), (pb) => {
        socket.removeEventListener('error', onErr)
        try {
          if (pb.Status === Status.Sucess) {
            return cb()
          } else {
            return cb(new Error('Ping Value Failed'))
          }
        } catch (err) {
          return cb(err)
        }
      })
      socket.once('error', onErr)
      socket.send(request)
    })
  }

  pingStorage (id, type, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let getSocket = _getSocket.get(this)
    if (!bucket.count) {
      return cb(new Error('No Peers Connected'))
    }
    let to = bucket.get(id)
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Ping_Storage
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let pingstoragepb = {}
    pingstoragepb.type = type
    requestpb.payload = new PingStorageRequest(pingstoragepb).encode().toBuffer()
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    getSocket(to, (err, socket) => {
      if (err) {
        return cb(err)
      }
      let onErr = (err) => {
        return cb(err)
      }
      socket.once(requestpb.id.toString('hex'), (pb) => {
        socket.removeEventListener('error', onErr)
        try {
          if (pb.Status === Status.Sucess) {
            let storagepb = PingStorageResponse.decode(pb.payload)
            return process.nextTick(()=> {
              return cb(null, storagepb.capacity)
            })
          } else {
            return process.nextTick((err)=> {
              return cb(new Error('Ping Storage Failed'))
            })
          }
        } catch (err) {
          return cb(err)
        }
      })
      socket.once('error', onErr)
      socket.send(request)
    })
  }
}

function sanitizeRPC (rpc) {
  try {
    rpc.id = rpc.id.toBuffer()
    rpc.from.id = rpc.from.id.toBuffer()
    rpc.from.extPort = rpc.from.extPort.toNumber()
    rpc.from.intPort = rpc.from.intPort.toNumber()
    if (rpc.payload) {
      rpc.payload = rpc.payload.toBuffer()
    }
  } catch (ex) {

  }
}
function sanitizeFindNodeRequest (req) {
  try {
    req.id = req.id.toBuffer()
    req.count = req.count.toNumber()
  } catch (ex) {

  }
}
function sanitizePeer (peer) {
  try {
    peer.id = peer.id.toBuffer()
    peer.port = peer.port.toNumber()
  } catch (ex) {

  }
}
function sanitizeValueResponse (value) {
  try {
    value.hash = value.hash.toBuffer()
    value.data = value.data.toBuffer()
  } catch (ex) {

  }
}
function sanitizeValueRequest (value) {
  try {
    value.hash = value.hash.toBuffer()
    value.count = value.count.toNumber()
  } catch (ex) {

  }
}
function sanitizeStoreRequest (value) {
  try {
    value.value = value.value.toBuffer()
  } catch (ex) {

  }
}
function sanitizeRandomRequest (value) {
  try {
    value.filter = value.filter.toBuffer()
  } catch (ex) {

  }
}
function sanitizeRandomResponse (value) {
  try {
    value.value = value.value.toBuffer()
    value.filter = value.filter.toBuffer()
  } catch (ex) {

  }
}
function sanitizePingValueRequest (value) {
  try {
    value.hash = value.hash.toBuffer()
  } catch (ex) {

  }
}
