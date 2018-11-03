const dns = require('dns')
const bs58 = require('bs58')
const fs = require('fs')
const path = require('path')
const net = require('net')
const cbor = require('cbor')
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

  toLocator () {
    return bs58.encode(cbor.encode(this.toJSON()))
  }

  static fromLocator(loc) {
    return this.fromJSON(cbor.decode(bs58.decode(loc)))
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