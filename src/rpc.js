'use strict'
const Peer = require('./peer')
const Bucket = require('./bucket')
const Cuckoo = require('cuckoo-filter').ScalableCuckooFilter
const util = require('./utility')
const Messenger = require('udp-messenger')
const config = require('../config')
const protobuf = require('protobufjs')
const crypto = require('crypto')
const increment = require('increment-buffer')
const path = require('path')
const file = path.join(__dirname, '/proto/', 'rpc.proto')
const builder = protobuf.loadProtoFile(file)
const RPCProto = builder.build('RPCProto')
const FindNodeRequest = RPCProto.FindNodeRequest
const FindNodeResponse = RPCProto.FindNodeResponse
const FindValueRequest = RPCProto.FindValueRequest
const FindValueResponse = RPCProto.FindValueResponse
const StoreRequest = RPCProto.StoreRequest
const RandomRequest = RPCProto.RandomRequest
const RandomResponse = RPCProto.RandomResponse
const PromotionRequest = RPCProto.PromotionRequest
const RPCType = RPCProto.RPCType
const ValueType = RPCProto.ValueType
const Direction = RPCProto.Direction
const Status = RPCProto.Status
let _messenger = new WeakMap()
let _requests = new WeakMap()
let _peer = new WeakMap()
let _rpcid = new WeakMap()
let _bucket = new WeakMap()
let _rpcInterface = new WeakMap()

module.exports = class RPC {
  constructor (peer, messenger, bucket, rpcInterface) {
    if (!(peer instanceof Peer)) {
      throw new TypeError('Invalid Peer')
    }
    if (!(messenger instanceof Messenger)) {
      throw new TypeError('Invalid Messenger')
    }
    if (!(bucket instanceof Bucket)) {
      throw new TypeError('Invalid Bucket')
    }
    if (!rpcInterface) {
      throw new TypeError('Invalid RPC Interface')
    }

    _requests.set(this, new Map())
    _bucket.set(this, bucket)
    _peer.set(this, peer)
    _messenger.set(this, messenger)
    _rpcInterface.set(this, rpcInterface)
    _rpcid.set(this, crypto.randomBytes(2))
    let pingResponse = (pb)=> {
      let responsepb = {}
      responsepb.id = pb.id
      responsepb.type = pb.type
      responsepb.comType = Direction.Response
      responsepb.from = peer.toJSON()
      let response = new RPCProto.RPC(responsepb).encode().toBuffer()
      messenger.send(response, pb.from.ip, pb.from.port)
    }
    let findNodeResponse = (pb)=> {
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
      messenger.send(response, pb.from.ip, pb.from.port)
    }
    let findValueResponse = (pb)=> {
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
          messenger.send(response, pb.from.ip, pb.from.port)
        } else {
          let valueRespb = { hash: valuepb.hash, data: value, type: valuepb.type, number: number, nodes: [] }
          let payload = new FindValueResponse(valueRespb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Success
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          messenger.send(response, pb.from.ip, pb.from.port)
        }
      })
    }
    //save data
    let storeResponse = (pb)=> {
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
        messenger.send(response, pb.from.ip, pb.from.port)
      })
    }
    let randomResponse = (pb)=> {
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
          messenger.send(response, pb.from.ip, pb.from.port)
        } else {
          let randompb = { type: type, number: number, value: block.data }
          let payload = new RandomResponse(randompb).encode().toBuffer()
          responsepb.payload = payload
          responsepb.status = Status.Success
          let response = new RPCProto.RPC(responsepb).encode().toBuffer()
          messenger.send(response, pb.from.ip, pb.from.port)
        }
      })
    }
    let promotionResponse = (pb)=> {
      let promotionpb = PromotionRequest.decode(pb.payload)
      sanitizePromotionRequest(promotionpb)
      let requests = _requests.get(this)
      let key = pb.id.toString('hex')
      if (!requests.has(key) && !rpcInterface.containsValueAt(promotionpb.number, promotionpb.hash, promotionpb.type)) {
        rpcInterface.promoteValue(promotionpb.hash, promotionpb.number, promotionpb.type, (err)=> {
          if (err) {
            if (err === 'Find this block') {
              this.findValue(promotionpb.hash, promotionpb.type, (err)=> {
                if (err) {
                  return console.log(err)
                }
                console.log('block found')
              })
            }
          }
        })
        let bucket = _bucket.get(this)
        let nodes = bucket.toArray()
        let filter = Cuckoo.fromCBOR(promotionpb.filter)

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
        for (let i = 0; i < nodes.length; i++) {
          let node = nodes[ i ]
          messenger.send(request, node.ip, node.port)
        }
      }
    }
    // This takes a request and creates an appropriate response for its type
    let handleRequest = (pb)=> {
      let bucket = _bucket.get(this)
      bucket.add(new Peer(pb.from.id, pb.from.ip, pb.from.port))
      _bucket.set(this, bucket)
      switch (pb.type) {
        case RPCType.Ping :
          pingResponse(pb)
          break;
        case RPCType.Find_Node :
          findNodeResponse(pb)
          break;
        case RPCType.Find_Value :
          findValueResponse(pb)
          break;
        case RPCType.Store :
          storeResponse(pb)
          break;
        case RPCType.Random :
          randomResponse(pb)
          break;
        case RPCType.Promotion :
          promotionResponse(pb)
          break;
      }
    }

    let findNodeRequest = (pb)=> {
      let requests = _requests.get(this)
      let key = pb.id.toString('hex')
      let request = requests.get(key)
      if (!request) {
        return
      }
      clearTimeout(request.timer)
      let bucket = _bucket.get(this)
      request.resCount++
      let nodespb = FindNodeResponse.decode(pb.payload)
      let nodeBucket = request.nodeBucket
      let thisNode = _peer.get(this)
      nodespb.nodes.forEach((peer)=> {
        sanitizePeer(peer)
        if (peer.id.equals(thisNode.id)) {
          return
        }
        peer = new Peer(peer.id, peer.ip, peer.port)
        nodeBucket.add(peer)
        bucket.add(peer)
      })
      if (request.resCount >= config.nodeCount) {
        requests.delete(key)
        _requests.set(this, requests)
        return process.nextTick(request.cb)
      } else {
        let queried = request.queried
        let query = ()=> {
          let nodes = nodeBucket.closest(request.id, config.nodeCount)
          let isSending = (nodes.length > 0) && (queried.length < config.nodeCount)
          for (let i = 0; i < config.concurrency && i < nodes.length && i < config.nodeCount && queried.length < config.nodeCount; i++) {
            let node = nodes.shift()
            while (queried.find((peer)=> {return peer.id === node.id})) {
              node = nodes.shift()
            }
            queried.push(node)
            messenger.send(request.req, node.ip, node.port)
          }
          for (let i = 0; i < queried.length; i++) {
            nodeBucket.remove(queried[ i ])
          }

          if (isSending) {
            let timer = setTimeout(()=> {
              let requests = _requests.get(this)
              let request = requests.get(key)
              if (request) {
                if ((nodes.length > 0) && (queried.length < config.storeCount)) {
                  query()
                } else {
                  requests.delete(key)
                  _requests.set(this, requests)
                  process.nextTick(()=> {
                    return request.cb(new Error("Find Node Timed Out"))
                  })
                }
              }
            }, config.timeout)
            request.timer = timer
          }
          request.queried = queried
          request.nodes = nodes
          requests.set(key, request)
          _requests.set(this, requests)
        }
        query()
      }
    }

    let pingRequest = (pb)=> {
      let requests = _requests.get(this)
      let key = pb.id.toString('hex')
      let request = requests.get(key)
      if (!request) {
        return
      }
      clearTimeout(request.timer)
      requests.delete(key)
      _requests.set(this, requests)
      return process.nextTick(request.cb)
    }

    let findValueRequest = (pb)=> {
      let requests = _requests.get(this)
      let key = pb.id.toString('hex')
      let request = requests.get(key)
      if (!request) {
        return
      }
      clearTimeout(request.timer)
      let bucket = _bucket.get(this)
      request.resCount++
      let valuespb = FindValueResponse.decode(pb.payload)

      sanitizeValueResponse(valuespb)
      let nodeBucket = request.nodeBucket
      if (valuespb.data) {
        requests.delete(key)
        _requests.set(this, requests)
        return rpcInterface.storeValueAt(valuespb.data, valuespb.number, valuespb.type, (err)=> {
          return process.nextTick(()=> {
            return request.cb(err)
          })
        })
      }
      let thisNode = _peer.get(this)
      valuespb.nodes.forEach((peer)=> {
        sanitizePeer(peer)
        if (peer.id.equals(thisNode.id)) {
          return
        }
        peer = new Peer(peer.id, peer.ip, peer.port)
        nodeBucket.add(peer)
        bucket.add(peer)
      })
      if (request.resCount >= nodeBucket.count) {
        requests.delete(key)
        _requests.set(this, requests)
        return process.nextTick(()=> {
          return request.cb(new Error("Value Not Found"))
        })
      } else {
        let query = ()=> {
          let queried = request.queried
          let nodes = nodeBucket.closest(valuespb.hash, config.nodeCount)
          let isSending = (nodes.length > 0) && (queried.length < config.nodeCount)
          for (let i = 0; i < config.concurrency && i < nodes.length && i < config.nodeCount && queried.length < config.nodeCount; i++) {
            let node = nodes.shift()
            while (queried.find((peer)=> {return peer.id === node.id})) {
              node = nodes.shift()
            }
            queried.push(node)
            messenger.send(request.req, node.ip, node.port)
          }

          for (let i = 0; i < queried.length; i++) {
            nodeBucket.remove(queried[ i ])
          }
          if (isSending) {
            let timer = setTimeout(()=> {
              let requests = _requests.get(this)
              let request = requests.get(key)
              if (request) {
                if ((nodes.length > 0) && (queried.length < config.storeCount)) {
                  query()
                } else {
                  requests.delete(key)
                  _requests.set(this, requests)
                  process.nextTick(()=> {
                    return request.cb(new Error("Find Value Timed Out"))
                  })
                }
              }
            }, config.timeout)
            request.timer = timer
          }
          request.queried = queried
          request.nodes = nodes
          requests.set(key, request)
          _requests.set(this, requests)
        }
        query()
      }
    }

    let storeRequest = (pb)=> {
      let requests = _requests.get(this)
      let key = pb.id.toString('hex')
      let request = requests.get(key)
      if (!request) {
        return
      }
      clearTimeout(request.timer)
      let bucket = _bucket.get(this)
      request.resCount++

      let nodes = request.nodes
      if (pb.status == Status.Success && request.resCount >= config.storeCount) {
        requests.delete(key)
        _requests.set(this, requests)
        return process.nextTick(request.cb)
      }
      if (request.resCount >= nodes.length) {
        requests.delete(key)
        _requests.set(this, requests)
        return process.nextTick(()=> {
          return request.cb(new Error("Value Not Stored"))
        })
      } else {
        let queried = request.queried
        let isSending = (nodes.length > 0) && (queried.length < config.storeCount)
        for (let i = 0; i < config.concurrency && i < nodes.length && i < config.storeCount && queried.length < config.storeCount; i++) {
          let node = nodes.shift()
          while (queried.find((peer)=> {return peer.id === node.id})) {
            node = nodes.shift()
          }
          queried.push(node)
          messenger.send(request.req, node.ip, node.port)
        }
        if (isSending) {
          let timer = setTimeout(()=> {
            let requests = _requests.get(this)
            let request = requests.get(key)
            if (request) {
              requests.delete(key)
              _requests.set(this, requests)
              process.nextTick(()=> {
                return request.cb(new Error("Find Value Timed Out"))
              })
            }
          }, config.timeout)
          request.timer = timer
        }
        request.queried = queried
        request.nodes = nodes
        requests.set(key, request)
        _requests.set(this, requests)
      }

    }
    let randomRequest = (pb)=> {
      let requests = _requests.get(this)
      let key = pb.id.toString('hex')
      let request = requests.get(key)
      if (!request) {
        return
      }
      clearTimeout(request.timer)

      let bucket = _bucket.get(this)
      request.resCount++
      let randompb = RandomResponse.decode(pb.payload)

      sanitizeRandomResponse(randompb)
      let nodes = request.nodes

      if (pb.status == Status.Success && randompb.value) {
        rpcInterface.storeValueAt(randompb.value, randompb.number, randompb.type, (err)=> {
          requests.delete(key)
          return process.nextTick(()=> {
            return request.cb(err)
          })
        })
      }

      if (request.resCount >= config.nodeCount) {
        requests.delete(key)
        _requests.set(this, requests)
        return process.nextTick(()=> {
          return request.cb(new Error("Random Not Found"))
        })
      } else {
        let queried = request.queried
        let isSending = (nodes.length > 0) && (queried.length < config.nodeCount)
        for (let i = 0; i < config.concurrency && i < nodes.length && i < config.nodeCount && queried.length < config.nodeCount; i++) {
          let index = config.getRandomInt(0, nodes.length)// random selection of nodes to ask
          let node = nodes.splice(index, 1)
          while (queried.find((peer)=> {return peer.id === node.id})) {
            node = nodes.shift()
          }
          queried.push(node)
          messenger.send(request.req, node.ip, node.port)
        }
        if (isSending) {
          let timer = setTimeout(()=> {
            let requests = _requests.get(this)
            let request = requests.get(key)
            if (request) {
              requests.delete(key)
              _requests.set(this, requests)
              process.nextTick(()=> {
                return request.cb(new Error("Find Value Timed Out"))
              })
            }
          }, config.timeout)
          request.timer = timer
        }
        request.queried = queried
        request.nodes = nodes
        requests.set(key, request)
        _requests.set(this, requests)
      }
    }
    let handleResponse = (pb)=> {
      switch (pb.type) {
        case RPCType.Ping :
          pingRequest(pb)
          break;
        case RPCType.Find_Node :
          findNodeRequest(pb)
          break;
        case RPCType.Find_Value :
          findValueRequest(pb)
          break;
        case RPCType.Store :
          storeRequest(pb)
          break;
        case RPCType.Random :
          randomRequest(pb)
          break;
      }
    }
    let onmessage = (msg)=> {
      let pb = RPCProto.RPC.decode(msg)
      sanitizeRPC(pb)
      if (pb) {
        switch (pb.comType) {
          case Direction.Response :
            handleResponse(pb)
            break;
          case Direction.Request :
            handleRequest(pb)
            break;
        }
      }
    }
    messenger.on('message', onmessage)

    let ondropped = ()=> {}
    messenger.on('dropped', ondropped)
  }

  findNode (id, cb) {
    let messenger = _messenger.get(this)
    let peer = _peer.get(this)
    let rpcid = _rpcid.get(this)
    let bucket = _bucket.get(this)
    let requests = _requests.get(this)
    let requestpb = {}
    requestpb.id = rpcid.slice(0)
    requestpb.type = RPCType.Find_Node
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let findnodepb = {}
    findnodepb.id = id
    findnodepb.count = config.nodeCount
    let payload = new FindNodeRequest(findnodepb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    let query = ()=> {
      let nodes = bucket.closest(id, config.nodeCount)
      let queried = []
      for (let i = 0; i < config.concurrency && i < nodes.length && i < config.nodeCount && queried.length < config.nodeCount; i++) {
        let node = nodes.shift()
        queried.push(node)
        messenger.send(request, node.ip, node.port)
      }

      let nodeBucket = new Bucket(peer.id, 20)
      for (let i = 0; i < nodes.length; i++) {
        nodeBucket.add(nodes[ i ])
      }

      let key = requestpb.id.toString('hex')
      let timer = setTimeout(()=> {
        let requests = _requests.get(this)
        let request = requests.get(key)
        if (request) {
          if ((nodes.length > 0) && (queried.length < config.storeCount)) {
            query()
          } else {
            requests.delete(key)
            _requests.set(this, requests)
            process.nextTick(()=> {
              return request.cb(new Error("Find Node Timed Out"))
            })
          }
        }
      }, config.timeout)

      requests.set(key, {
        req: request,
        resCount: 0,
        id: id,
        cb: cb,
        nodeBucket: nodeBucket,
        queried: queried,
        timer: timer
      })
      _requests.set(this, requests)
    }
    query()
    rpcid = increment(rpcid)
    _rpcid.set(this, rpcid)

  }

  findValue (hash, type, cb) {
    let messenger = _messenger.get(this)
    let peer = _peer.get(this)
    let rpcid = _rpcid.get(this)
    let bucket = _bucket.get(this)
    let requests = _requests.get(this)
    let requestpb = {}
    requestpb.id = rpcid.slice(0)
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
    let query = ()=> {
      let nodes = bucket.closest(hash, config.nodeCount)
      let queried = []
      for (let i = 0; i < config.concurrency && i < nodes.length && i < config.nodeCount && queried.length < config.nodeCount; i++) {
        let node = nodes.shift()
        queried.push(node)
        messenger.send(request, node.ip, node.port)
      }
      let nodeBucket = new Bucket(peer.id, 20)
      for (let i = 0; i < nodes.length; i++) {
        nodeBucket.add(nodes[ i ])
      }
      let key = requestpb.id.toString('hex')
      let timer = setTimeout(()=> {
        let requests = _requests.get(this)
        let request = requests.get(key)
        if (request) {
          if ((nodes.length > 0) && (queried.length < config.storeCount)) {
            query()
          } else {
            requests.delete(key)
            _requests.set(this, requests)
            process.nextTick(()=> {
              return request.cb(new Error("Find Value Timed Out"))
            })
          }
        }
      }, config.timeout)
      requests.set(key, { req: request, resCount: 0, cb: cb, nodeBucket: nodeBucket, queried: queried, timer: timer })
      _requests.set(this, requests)
    }
    query()
    rpcid = increment(rpcid)
    _rpcid.set(this, rpcid)

  }

  ping (id, cb) {
    let messenger = _messenger.get(this)
    let peer = _peer.get(this)
    let rpcid = _rpcid.get(this)
    let bucket = _bucket.get(this)
    let requests = _requests.get(this)
    let to = bucket.get(id)
    let requestpb = {}
    requestpb.id = rpcid.slice(0)
    requestpb.type = RPCType.Ping
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    messenger.send(request, to.ip, to.port)
    let key = requestpb.id.toString('hex')
    let timer = setTimeout(()=> {
      let requests = _requests.get(this)
      let request = requests.get(key)
      let bucket = _bucket.get(this)
      bucket.remove(to)
      _bucket.set(this, bucket)
      if (request) {
        requests.delete(key)
        _requests.set(this, requests)
        process.nextTick(()=> {
          return request.cb(new Error("Ping Timed Out"))
        })
      }
    }, config.timeout)
    requests.set(key, { req: request, cb: cb, timer: timer })
    _requests.set(this, requests)
    rpcid = increment(rpcid)
    _rpcid.set(this, rpcid)
  }

  store (hash, type, value, number, cb) {
    let messenger = _messenger.get(this)
    let peer = _peer.get(this)
    let rpcid = _rpcid.get(this)
    let bucket = _bucket.get(this)
    let requests = _requests.get(this)
    let requestpb = {}
    requestpb.id = rpcid.slice(0)
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
    let nodes = bucket.closest(hash, config.nodeCount)
    let queried = []
    for (let i = 0; i < config.concurrency && i < nodes.length && i < config.nodeCount; i++) {
      let node = nodes.shift()
      queried.push(node)
      messenger.send(request, node.ip, node.port)
    }
    requests.set(requestpb.id.toString('hex'), { req: request, resCount: 0, cb: cb, nodes: nodes, stored: queried })
    _requests.set(this, requests)
    rpcid = increment(rpcid)
    _rpcid.set(this, rpcid)
  }

  random (number, count, type, filter, cb) {
    let messenger = _messenger.get(this)
    let peer = _peer.get(this)
    let rpcid = _rpcid.get(this)
    let bucket = _bucket.get(this)
    let requests = _requests.get(this)
    let requestpb = {}
    requestpb.id = rpcid.slice(0)
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
    let queried = []
    for (let i = 0; i < count && i < nodes.length && i < count && queried.length < count; i++) {
      let index = util.getRandomInt(0, nodes.length - 1)// random selection of nodes to ask
      let node = nodes.splice(index, 1)[ 0 ]
      console.log(node)
      queried.push(node)
      messenger.send(request, node.ip, node.port)
    }
    let key = requestpb.id.toString('hex')
    let timer = setTimeout(()=> {
      let requests = _requests.get(this)
      let request = requests.get(key)
      if (request) {
        requests.delete(key)
        _requests.set(this, requests)
        process.nextTick(()=> {
          return request.cb(new Error("Find Random Timed Out"))
        })
      }
    }, config.timeout)
    requests.set(key, { req: request, count: count, resCount: 0, cb: cb, nodes: nodes, queried: queried, timer: timer })
    _requests.set(this, requests)
    rpcid = increment(rpcid)
    _rpcid.set(this, rpcid)

  }

  promote (hash, number, type, cb) {
    let messenger = _messenger.get(this)
    let peer = _peer.get(this)
    let rpcid = _rpcid.get(this)
    let bucket = _bucket.get(this)
    let requests = _requests.get(this)
    let requestpb = {}
    requestpb.id = rpcid.slice(0)
    requestpb.type = RPCType.Promotion
    requestpb.comType = Direction.Request
    requestpb.from = peer.toJSON()
    let promotionpb = {}
    promotionpb.hash = hash
    promotionpb.number = number
    promotionpb.type = type

    let nodes = bucket.toArray()
    let filter = new Cuckoo(bucket.count + Math.ceil(bucket.count * .95), config.bucketSize, config.fingerprintSize)

    for (let i = 0; i < nodes.length; i++) {
      filter.add(nodes[ i ].id)
    }
    filter.add(peer.id)
    promotionpb.filter = filter.toCBOR()
    let payload = new PromotionRequest(promotionpb).encode().toBuffer()
    requestpb.payload = payload
    let request = new RPCProto.RPC(requestpb).encode().toBuffer()
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[ i ]
      messenger.send(request, node.ip, node.port)
    }

    let key = requestpb.id.toString('hex')
    requests.set(key, { req: request })
    setTimeout(()=> {
      requests.delete(key)
    }, config.timeout)

    rpcid = increment(rpcid)
    _rpcid.set(this, rpcid)
    process.nextTick(cb)

  }

  connect (peer, cb) {
    let bucket = _bucket.get(this)
    bucket.add(peer)
    this.ping(peer.id, (err)=> {
      if (err) {
        return process.nextTick(()=> {
          return cb(new Error("Failed to connect"))
        })
      }
      return process.nextTick(cb)
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