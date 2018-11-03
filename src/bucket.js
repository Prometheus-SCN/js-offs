'use strict'
const EventEmitter = require('events').EventEmitter
const hamming = require('hamming-distance')
let _size = new WeakMap()
let _nodeId = new WeakMap()
let _zero = new WeakMap()
let _one = new WeakMap()
let _bucket = new WeakMap()
let _root = new WeakMap()
let _capped = new WeakMap()
let Peer = require('./peer.js')
module.exports = class Bucket extends EventEmitter {
  constructor (nodeId, size, root) {
    if (!Buffer.isBuffer(nodeId)) {
      throw new TypeError('Invalid Node ID')
    }
    if (!Number.isInteger(size)) {
      throw new TypeError('Invalid Size')
    }
    super()
    _bucket.set(this, [])
    _nodeId.set(this, nodeId)
    _size.set(this, size)
    _root.set(this, root || this)
    _capped.set(this, false)
  }

  get size () {
    return _size.get(this)
  }

  static distance (nodeA, nodeB) {
    return hamming(nodeA, nodeB)
  }

  cap () {
    _capped.set(this, true)
  }

  get capped () {
    return _capped.get(this)
  }

  get count () {
    let bucket = _bucket.get(this)
    if (bucket) {
      return bucket.length
    } else {
      let zero = _zero.get(this)
      let one = _one.get(this)
      return zero.count + one.count
    }
  }

  toArray () {
    let bucket = _bucket.get(this)
    if (bucket) {
      return bucket.slice(0)
    } else {
      let zero = _zero.get(this)
      let one = _one.get(this)
      return zero.toArray().concat(one.toArray())
    }
  }

  toString () {
    let bucket = _bucket.get(this)
    if (bucket && bucket.length) {
      let bucketStr = ""
      return bucket.reduce((pre, peer, i)=> {
        let str = ''
        if (i != 0) {
          str += '\n'
        }
        str += peer.toString()
        return pre + str
      })
    }
    else {
      let zero = _zero.get(this)
      let one = _one.get(this)
      if (zero && one) {
        return zero.toString() + '\n' + one.toString()
      } else {
        return ""
      }
    }
  }

  getBit (peerId, index) {
    if (!index) {
      index = 0
    }
    let byte = parseInt(index / 8, 10)
    let byteIndex = index % 8
    if ((peerId.length < byte) && (byteIndex !== 0)) {
      return false
    }
    if (peerId[ byte ] & Math.pow(2, (7 - byteIndex))) {
      return true
    } else {
      return false
    }
  }

  add (peer, index) {
    if (!(peer instanceof Peer)) {
      throw new Error('Invalid Peer')
    }
    if (!(peer.id)) {
      throw new Error('Invalid Peer')
    }
    const nodeId = _nodeId.get(this)
    if (nodeId.equals(peer.id)) {
      throw new Error('Invalid Peer: Self')
    }
    if (!index) {
      index = 0
    }
    if (isNaN(index)) {
      throw new Error('Invalid index')
    }
    let bucket = _bucket.get(this)
    let root = _root.get(this)
    if (bucket) {
      let found = bucket.find((known)=> { return known.id.compare(peer.id) === 0}) //TODO fix double search
      if (found && (found.ip !== peer.ip || found.port !== peer.port)) {
        this.update(peer)
      } else {
        let size = _size.get(this)
        if (bucket.length < size) {
          bucket.push(peer)
          root.emit('added')
        } else {
          if (this.capped) {
            root.emit('ping', bucket.slice(0), peer)
          } else {
            this.split(index)
            this.add(peer, index)
          }
        }
      }
    } else {
      if (this.getBit(peer.id, index++)) {
        let one = _one.get(this)
        one.add(peer, index)
        _one.set(this, one)
      } else {
        let zero = _zero.get(this)
        zero.add(peer, index)
        _zero.set(this, zero)
      }
    }
  }

  update (peer) {
    let bucket = _bucket.get(this)
    bucket = bucket.filter((known)=> { return known.id.compare(peer.id) !== 0})
    bucket.push(peer)
    let root = _root.get(this)
    root.emit('updated')
  }

  remove (peer, index) {
    if (!index) {
      index = 0
    }
    let bucket = _bucket.get(this)
    if (bucket) {
      bucket = bucket.filter((known)=> { return known.id.compare(peer.id) !== 0})
      _bucket.set(this, bucket)
      let root = _root.get(this)
      root.emit('removed', peer)
    } else {
      if (this.getBit(peer.id, index++)) {
        let one = _one.get(this)
        one.remove(peer, index)
      } else {
        let zero = _zero.get(this)
        zero.remove(peer, index)
      }
    }
  }

  get (peerId, index) {
    if (!index) {
      index = 0
    }
    let bucket = _bucket.get(this)
    if (bucket) {
      let found = bucket.find((peer)=> {
        return peer.id.compare(peerId) === 0
      })
      return found
    } else {
      if (this.getBit(peerId, index++)) {
        let one = _one.get(this)
        return one.get(peerId, index)
      } else {
        let zero = _zero.get(this)
        return zero.get(peerId, index)
      }
    }
  }

  split (index) {
    if (!index) {
      index = 0
    }
    let bucket = _bucket.get(this)
    let size = _size.get(this)
    if (!(bucket.length >= size)) {
      return
    }
    let root = _root.get(this)
    let nodeId = _nodeId.get(this)

    let one = new Bucket(nodeId, size, root)
    let zero = new Bucket(nodeId, size, root)
    _one.set(this, one)
    _zero.set(this, zero)

    index++
    for (let i = 0; i < bucket.length; i++) {
      let peer = bucket[ i ]

      if (this.getBit(peer.id, index)) {
        one.add(peer, index)
      } else {
        zero.add(peer, index)
      }
    }
    bucket = null

    if (this.getBit(nodeId, index)) {
      zero.cap()
    } else {
      one.cap()
    }
  }

  closest (id, count, index) {
    if (!index) {
      index = 0
    }

    let bucket = _bucket.get(this)
    if (bucket) {
      let distance = new WeakMap()
      return bucket.map((peer)=> {
        distance.set(peer, Bucket.distance(peer.id, id))
        return peer
      })
        .sort((a, b)=> {
          return distance.get(a) - distance.get(b)
        })
        .slice(0, count)
    } else {
      let peers
      if (this.getBit(id, index++)) {
        let one = _one.get(this)
        peers = one.closest(id, count, index)
        if (peers.length < count) {
          let zero = _zero.get(this)
          peers = peers.concat(zero.closest(id, count, index))
        }
      } else {
        let zero = _zero.get(this)
        peers = zero.closest(id, count, index)
        if (peers.length < count) {
          let one = _one.get(this)
          peers = peers.concat(one.closest(id, count, index))
        }
      }
      return peers.slice(0, count)
    }
  }
}
