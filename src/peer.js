const dns = require('dns')
const isIP = require('is-ip')
const bs58 = require('bs58')
const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, '/proto/', 'peer.proto')
const protobuf = require('protocol-buffers')
const peerproto = protobuf(fs.readFileSync(file))
let _port = new WeakMap()
let _ip = new WeakMap()
let _id= new WeakMap()
let _key = new WeakMap()

module.exports =  class Peer{
  constructor(id, ip, port){
    if(!Buffer.isBuffer(id)){
      throw new Error('Id is not a buffer')
    }
    if(!isIP(ip)){
      throw new Error('Ip is not a valid address')
    }
    if(isNaN(port)){
      throw new Error('Port is not a Number')
    }
    _ip.set(this, ip)
    _id.set(this, id)
    _port.set(this, port)
  }
  get id(){
    return _id.get(this).slice(0)
  }

  get ip(){
    return _ip.get(this)
  }

  get port(){
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
  toString(){
    return `id:${this.key} ip:${this.ip} port: ${this.port}`
  }
  toJSON(){
    return {id:this.id, ip: this.ip, port: this.port}
  }
  marshal(){
    let pb= {
      id: this.id,
      ip: this.ip,
      port: this.port
    }
    return peerproto.peer.encode(pb)
  }
  static unmarshal(protobuf){
    let pb =peerproto.peer.decode(protobuf)
    return pb
  }
}