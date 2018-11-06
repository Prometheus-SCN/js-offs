const dns = require('dns')
const bs58 = require('bs58')
const fs = require('fs')
const path = require('path')
const net = require('net')
const cbor = require('cbor-js')
const toAb = require('to-array-buffer')
const abToB = require('arraybuffer-to-buffer')
let _port = new WeakMap()
let _ip = new WeakMap()
let _id = new WeakMap()
let _key = new WeakMap()

module.exports = class Peer {
  constructor (id, ip, port) {
    if (!Buffer.isBuffer(id)) {
      throw new Error('Id is not a buffer')
    }
    if (!net.isIP(ip)) {
      throw new Error('Ip is not a valid address')
    }
    if (!Number.isInteger(port)) {
      throw new Error('Port is not a Number')
    }
    _ip.set(this, ip)
    _id.set(this, id)
    _port.set(this, port)
  }

  get id () {
    return _id.get(this).slice(0)
  }

  get ip () {
    return _ip.get(this)
  }

  get port () {
    return _port.get(this)
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
    return `id: ${this.key} ip: ${this.ip} port: ${this.port}`
  }

  toJSON () {
    return { id: this.id, ip: this.ip, port: this.port }
  }
  static fromJSON(peer) {
    return new Peer(peer.id, peer.ip, peer.port)
  }
}