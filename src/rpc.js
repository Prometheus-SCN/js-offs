'use strict'
const Peer = require('./peer')
const Bucket = require('./bucket')
const net = require('net')
const ScalableCuckoo = require('cuckoo-filter').ScalableCuckooFilter
const Cuckoo = require('cuckoo-filter').CuckooFilter
const util = require('./utility')
const config = require('../config')
const protobuf = require('protobufjs')
const collect = require('collect-stream')
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
const PromotionRequest = RPCProto.PromotionRequest
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

module.exports = class RPC extends EventEmitter {
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
    let pingResponse = (pb, socket)=> {
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      responsepb.status = Status.Success
      let response = new RPCProto.RPC(responsepb).encode().toBuffer()
      let msg = RPCProto.RPC.decode(response)
      socket.end(response)
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
      socket.end(response)
    }
    let findValueResponse = (pb, socket)=> {
      let valuepb = FindValueRequest.decode(pb.payload)
      sanitizeValueRequest(valuepb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      rpcInterface.getValue(valuepb.hash, valuepb.type, (err, value, number)=> {
        if (err) {
          let peers = bucket.closest(valuepb.hash, valuepb.count)
          peers = peers.map((peer)=> { return peer.toJSON()})
          let valueRespb = { hash: valuepb.hash, type: valuepb.type, number: 0, nodes: peers }
          let payload = new FindValueResponse(valueRespb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Failure
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.end(response)
        } else {
          let valueRespb = { hash: valuepb.hash, data: value, type: valuepb.type, number: number, nodes: [] }
          let payload = new FindValueResponse(valueRespb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Success
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.end(response)
        }
      })
    }
    //save data
    let storeResponse = (pb, socket)=> {
      let storepb = StoreRequest.decode(pb.payload)
      sanitizeStoreRequest(storepb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      rpcInterface.storeValueAt(storepb.value, storepb.number, storepb.type, (err)=> {
        if (err) {
          responsepb.status = Status.Failure
        } else {
          responsepb.status = Status.Success
        }
        let response = new RPCProto.RPC(responsepb).encode().toBuffer()
        socket.end(response)
      })
    }
    let randomResponse = (pb, socket)=> {
      let randompb = RandomRequest.decode(pb.payload)
      sanitizeRandomRequest(randompb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      let type = randompb.type
      rpcInterface.getRandomAt(randompb.number, Cuckoo.fromCBOR(randompb.filter), pb.from.id, randompb.type, (err, number, block)=> {
        if (err) {
          responsepb.status = Status.Failure
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.end(response)
        } else {
          let randompb = { type: type, number: number, value: block.data }
          let payload = new RandomResponse(randompb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Success
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          socket.end(response)
        }
      })
    }
    let promotionResponse = (pb, socket)=> {
      socket.end()
      let promotionpb = PromotionRequest.decode(pb.payload)
      sanitizePromotionRequest(promotionpb)
      let key = pb.id.toString('hex')
      if (!rpcInterface.containsValueAt(promotionpb.number, promotionpb.hash, promotionpb.type)) {
        rpcInterface.promoteValue(promotionpb.hash, promotionpb.number, promotionpb.type, (err)=> {
          if (err) {
            if (err === 'Find this block') {
              this.findValue(promotionpb.hash, promotionpb.type, (err) => { //TODO:Need to determine what appropriate error response should be

              })
            }
          }
        })
        let bucket = _bucket.get(this)
        let nodes = bucket.toArray()
        let filter = ScalableCuckoo.fromCBOR(promotionpb.filter)

        nodes = nodes.filter((node)=> {
          return !filter.contains(node.id)
        })

        for (let i = 0; i < nodes.length; i++) {
          let node = nodes[ i ]
          filter.add(node.id)
        }
        promotionpb.filter = filter.toCBOR()
        let payload = new PromotionRequest(promotionpb).encode().toBuffer()
        pb.payload = payload
        let request = new RPCProto.RPC(pb).encode().toBuffer()
        let i = -1
        let next = () => {
          i++
          if (i < nodes.length) {
            let to = nodes[ i ]
            let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, () => {
              collect(socket, () => {
                return next()
              })
              socket.end(request)
            })
          }
        }
        next()
      }
    }
    let pingValueResponse = (pb, socket)=> {
      let pingvaluepb = PingValueRequest.decode(pb.payload)
      sanitizePingValueRequest(pingvaluepb)
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      responsepb.status = rpcInterface.containsValue(pingvaluepb.hash, pingvaluepb.type) ? Status.Success : Status.Failure
      let response = new RPCProto.RPC(responsepb).encode().toBuffer()
      socket.end(response)
    }
    let pingStorageResponse = (pb, socket)=> {
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
      socket.end(response)
    }

    let onError = (err)=> {
      this.emit('error', err)
    }
    let onConnection = (socket)=> {
      socket.on('error', onError)
      collect(socket, (err, msg)=> {
        if (err) {
          return this.emit('error', err)
        }
        try {
          let pb = RPCProto.RPC.decode(msg)
          sanitizeRPC(pb)
          let bucket = _bucket.get(this)
          bucket.add(new Peer(pb.from.id, pb.from.ip, pb.from.port))
          _bucket.set(this, bucket)
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
            case RPCType.Promotion :
              promotionResponse(pb, socket)
              break;
            case RPCType.Ping_Value :
              pingValueResponse(pb, socket)
              break;
            case RPCType.Ping_Storage :
              pingStorageResponse(pb, socket)
              break;
          }
        } catch (err) {
          return this.emit('error', err)
        }
      })
    }

    let server = net.createServer({ allowHalfOpen: true }, onConnection)
    server.on('error', onError)
    let onlistening = ()=> {
      this.emit('listening')
    }
    server.on('listening', onlistening)
    _server.set(this, server)
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
    let port = _port.get(this)
    server.listen(port)
  }

  close (cb) {
    let server = _server.get(this)
    server.close(cb)
  }

  findNode (id, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
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
    let nodes = bucket.closest(hash, bucket.count)
    let nodeBucket = new Bucket(peer.id, config.kbucketSize)
    for (let i = 0; i < nodes.length; i++) {
      nodeBucket.add(nodes[ i ])
    }
    let queried = ScalableCuckoo(config.filterSize, config.bucketSize, config.fingerprintSize, config.scale)
    let i = 0
    let next = ()=> {
      if (nodeBucket.count > 0 && i < config.nodeCount) {
        let to = nodeBucket.closest(hash, 1).shift()
        queried.add(node.id)
        nodeBucket.remove(node)
        let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, ()=> {
          collect(socket, (err, msg)=> {
            if (err) {
              return process.nextTick(next)
            }
            try {
              i++
              let pb = RPCProto.RPC.decode(msg)
              sanitizeRPC(pb)
              let nodespb = FindNodeResponse.decode(pb.payload)
              let thisNode = peer
              nodespb.nodes.forEach((peer)=> {
                sanitizePeer(peer)
                if (peer.id.equals(thisNode.id)) {
                  return
                }
                peer = new Peer(peer.id, peer.ip, peer.port)
                if (!queried.contains(peer.id)) {
                  nodeBucket.add(peer)
                }
                bucket.add(peer)
              })
            } catch (err) {
              return process.nextTick(next)
            }
          })
          socket.end(request)
        })
        socket.on('error', (err) => {
          return next()
        })
      } else {
        return process.nextTick(cb)
      }
    }
    next()
  }

  findValue (hash, type, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
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
    let next = ()=> {
      if (nodeBucket.count > 0) {
        let to = nodeBucket.closest(hash, 1).shift()
        queried.add(to.id)
        nodeBucket.remove(to)
        let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, ()=> {
          collect(socket, (err, msg)=> {
            if (err) {
              return process.nextTick(()=> {
                return cb(err)
              })
            }
            try {
              let pb = RPCProto.RPC.decode(msg)
              sanitizeRPC(pb)
              let valuespb = FindValueResponse.decode(pb.payload)
              sanitizeValueResponse(valuespb)
              if (valuespb.data) {
                return rpcInterface.storeValueAt(valuespb.data, valuespb.number, valuespb.type, (err)=> {
                  return process.nextTick(()=> {
                    return cb(err)
                  })
                })
              } else {
                let thisNode = _peer.get(this)
                valuespb.nodes.forEach((peer)=> {
                  sanitizePeer(peer)
                  if (peer.id.equals(thisNode.id)) {
                    return
                  }
                  peer = new Peer(peer.id, peer.ip, peer.port)
                  if (!queried.contains(peer.id)) {
                    nodeBucket.add(peer)
                  }
                  bucket.add(peer)
                })
                process.nextTick(next)
              }
            } catch (err) {
              return process.nextTick(() => {
                return cb(err)
              })
            }
          })
          socket.end(request)
        })
        socket.on('error', (err) => {
          return process.nextTick(()=> {
            return cb(err)
          })
        })
      }
    }
    next()
  }

  ping (id, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let to = bucket.get(id)
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Ping
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, ()=> {
      collect(socket, (err, msg) => {
        if (err) {
          return process.nextTick((err)=> {
            return cb(err)
          })
        }
        try {
          let pb = RPCProto.RPC.decode(msg)
          sanitizeRPC(pb)
          if (pb.Status === Status.Sucess) {
            return process.nextTick(cb)
          } else {
            return process.nextTick((err)=> {
              return cb(new Error('Ping Failed'))
            })
          }
        } catch (err) {
          return process.nextTick((err)=> {
            return cb(err)
          })
        }
      })
      socket.end(request)
    })
    socket.on('error', (err) => {
      return process.nextTick(()=> {
        return cb(err)
      })
    })
  }

  store (hash, type, value, number, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Store
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let storepb = {}
    storepb.type = type
    storepb.value = value
    storepb.number = number
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
    let next = ()=> {
      if (nodeBucket.count > 0) {
        let to = nodeBucket.closest(hash, 1).shift()
        nodeBucket.remove(to)
        let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, ()=> {
          collect(socket, (err, msg)=> {
            if (err) {
              return process.nextTick(next)
            }
            try {
              let pb = RPCProto.RPC.decode(msg)
              sanitizeRPC(pb)
              if (pb.status == Status.Success && i++ && i >= redundancy) {
                return process.nextTick(cb)
              } else {
                return next()
              }
            } catch (err) {
              return process.nextTick(next)
            }
          })
          socket.end(request)
        })
        socket.on('error', () => {
          return next()
        })
      } else if (i < redundancy) {
        return process.nextTick(()=> {
          return cb(new Error('Value Not Stored'))
        })
      } else {
        return process.nextTick(cb)
      }
    }
    next()
  }

  random (number, count, type, filter, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let requestpb = {}
    let rpcInterface = _rpcInterface.get(this)
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Random
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let randompb = {}
    randompb.type = type
    randompb.number = number
    randompb.filter = filter.toCBOR()
    let payload = new RandomRequest(randompb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    let nodes = bucket.closest(peer.id, bucket.count)
    let i = 0
    let next = ()=> {
      if (nodes.length > 0 && i < count) {
        let index = util.getRandomInt(0, nodes.length - 1)// random selection of nodes to ask
        let to = nodes.splice(index, 1)[ 0 ]
        let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, ()=> {
          collect(socket, (err, msg)=> {
            if (err) {
              return process.nextTick(next)
            }
            try {
              let pb = RPCProto.RPC.decode(msg)
              sanitizeRPC(pb)
              if (pb.status == Status.Success) {
                let randompb = RandomResponse.decode(pb.payload)
                sanitizeRandomResponse(randompb)
                if (randompb.value) {
                  rpcInterface.storeValueAt(randompb.value, randompb.number, randompb.type, (err)=> {
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
              return process.nextTick(next)
            }
          })
          socket.end(request)
        })
        socket.on('error', (err) => {
          return next()
        })
      } else if (i < count) {
        return process.nextTick(()=> {
          return cb(new Error('Failed To Retrieve Random'))
        })
      } else {
        return process.nextTick(cb)
      }
    }
    next()
  }

  promote (hash, number, type, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
    let requestpb = {}
    requestpb.id = this.rpcid
    requestpb.type = RPCType.Promotion
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let promotionpb = {}
    promotionpb.hash = hash
    promotionpb.number = number
    promotionpb.type = type

    let nodes = bucket.toArray()
    let filter = new ScalableCuckoo(bucket.count + Math.ceil(bucket.count * .95), config.bucketSize, config.fingerprintSize)

    for (let i = 0; i < nodes.length; i++) {
      filter.add(nodes[ i ].id)
    }
    filter.add(peer.id)
    promotionpb.filter = filter.toCBOR()
    let payload = new PromotionRequest(promotionpb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    let i = -1
    let next = ()=> {
      i++
      if (i < nodes.length) {
        let to = nodes[ i ]
        let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, () => {
          socket.end(request, next)
        })
        socket.on('error', (err) => {
          return next()
        })
      }
    }
    next()
    process.nextTick(cb)
  }

  connect (peer, cb) {
    let bucket = _bucket.get(this)
    bucket.add(peer)
    this.ping(peer.id, (err)=> {
      if (err) {
        return process.nextTick(()=> {
          return cb(new Error('Failed to connect'))
        })
      }
      return process.nextTick(cb)
    })
  }

  pingValue (id, hash, type, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
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
    let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, ()=> {
      collect(socket, (err, msg)=> {
        if (err) {
          return process.nextTick((err)=> {
            return cb(err)
          })
        }
        try {
          let pb = RPCProto.RPC.decode(msg)
          sanitizeRPC(pb)
          if (pb.Status === Status.Sucess) {
            return process.nextTick(cb)
          } else {
            return process.nextTick((err)=> {
              return cb(new Error('Ping Value Failed'))
            })
          }
        } catch (err) {
          return process.nextTick((err)=> {
            return cb(err)
          })
        }
      })
      socket.end(request)
    })
    socket.on('error', (err) => {
      return process.nextTick(()=> {
        return cb(err)
      })
    })
  }

  pingStorage (id, type, cb) {
    let peer = _peer.get(this)
    let bucket = _bucket.get(this)
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
    let socket = net.connect({ host: to.ip, port: to.port, allowHalfOpen: true }, ()=> {
      collect(socket, (err, msg)=> {
        if (err) {
          return process.nextTick((err)=> {
            return cb(err)
          })
        }
        try {
          let pb = RPCProto.RPC.decode(msg)
          sanitizeRPC(pb)
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
          return process.nextTick((err)=> {
            return cb(err)
          })
        }
      })
      socket.end(request)
    })
    socket.on('error', (err) => {
      return process.nextTick(()=> {
        return cb(err)
      })
    })
  }
}

function sanitizeRPC (rpc) {
  try {
    rpc.id = rpc.id.toBuffer()
    rpc.from.id = rpc.from.id.toBuffer()
    rpc.from.port = rpc.from.port.toNumber()
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
    value.number = value.number.toNumber()
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
    value.number = value.number.toNumber()
    value.value = value.value.toBuffer()
  } catch (ex) {

  }
}
function sanitizeRandomRequest (value) {
  try {
    value.number = value.number.toNumber()
    value.filter = value.filter.toBuffer()
  } catch (ex) {

  }
}
function sanitizeRandomResponse (value) {
  try {
    value.number = value.number.toNumber()
    value.value = value.value.toBuffer()
    value.filter = value.filter.toBuffer()
  } catch (ex) {

  }
}
function sanitizePromotionRequest (value) {
  try {
    value.number = value.number.toNumber()
    value.hash = value.hash.toBuffer()
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
