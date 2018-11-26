const bs58 = require('bs58')
const fs = require('fs')
const net = require('net')
const cbor = require('cbor-js')
const toAb = require('to-array-buffer')
const abToB = require('arraybuffer-to-buffer')
let _extPort = new WeakMap()
let _extIp = new WeakMap()
let _intPort = new WeakMap()
let _intIp = new WeakMap()
let _id = new WeakMap()
let _key = new WeakMap()
let _self

module.exports = class Peer {
  constructor (id, extIp, extPort, intIp, intPort) {
    if (!Buffer.isBuffer(id)) {
      throw new TypeError('Id is not a buffer')
    }
    if (!net.isIP(intIp)) {
      throw new TypeError('Internal IP is not a valid address')
    }
    if (!Number.isInteger(intPort)) {
      throw new TypeError('Internal Port is not a Number')
    }
    if (!net.isIP(extIp)) {
      throw new TypeError('External IP is not a valid address')
    }
    if (!Number.isInteger(extPort)) {
      throw new TypeError('External Port is not a Number')
    }
    _extIp.set(this, extIp)
    _extPort.set(this, extPort)
    _id.set(this, id)
    _intIp.set(this, intIp)
    _intPort.set(this, intPort)
  }

  get id () {
    return _id.get(this).slice(0)
  }

  get extIp () {
    return _extIp.get(this)
  }

  get extPort () {
    return _extPort.get(this)
  }

  get intIp () {
    return _intIp.get(this)
  }

  get intPort () {
    return _intPort.get(this)
  }

  get key () {
    let key = _key.get(this)
    if (key) {
      return key
    } else {
      key = bs58.encode(this.id)
      _key.set(this, key)
      return key
    }
    return _key.get(this)
  }

  get ip () {
    let extIp = _extIp.get(this)
    if (extIp === _self.extIp) {
      return _intIp.get(this)
    } else {
      return extIp
    }
  }
  get port () {
    let extIp = _extIp.get(this)
    if (extIp === _self.extIp) {
      return _intPort.get(this)
    } else {
      return _extPort.get(this)
    }
  }

  isEqual(peer2) {
    let id1 = _id.get(this)
    let id2 = _id.get(peer2)
   return id1.compare(id2) === 0
  }

  toLocator () {
    return bs58.encode(abToB(cbor.encode(this.toJSON())))
  }

  static fromLocator(loc) {
    let obj = cbor.decode(toAb(bs58.decode(loc)))
    obj.id = Buffer.from(obj.id)
    return this.fromJSON(obj)
  }

  toString () {
    return `id:${this.key} external ip:${this.extIp} external port:${this.extPort} internal ip:${this.intIp} internal port:${this.intPort}`
  }

  toJSON () {
    return { id: this.id, extIp: this.extIp, extPort: this.extPort, intIp: this.intIp, intPort: this.intPort }
  }

  static fromJSON(peer) {
    return new Peer(peer.id, peer.extIp, peer.extPort, peer.intIp, peer.intPort)
  }

  static set self (value) {
    if (!(value instanceof Peer)) {
      throw new TypeError('Invalid Peer')
    }
    _self = value
  }
  static get self () {
    return _self
  }
}