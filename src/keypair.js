'use strict'
const forge = require('node-forge')
const fs = require('fs')
const protobuf = require('protocol-buffers')
const keyproto = protobuf(fs.readFileSync('./proto/keypair.proto'))
const _privateKey = new WeakMap()
const _publicKey = new WeakMap()
const _certificate = new WeakMap()

class Keypair {
  constructor (privateKey, publicKey, certificate) {
    _privateKey.set(this, privateKey)
    _publicKey.set(this, publicKey)
    _certificate.set(this, certificate)
  }

  get privateKey () {
    return _privateKey.get(this).slice(0)
  }

  get publicKey () {
    return _publicKey.get(this).slice(0)
  }

  get certificate () {
    return _certificate.get(this).slice(0)
  }

  marshal () {
    let keypair = {}
    keypair.privateKey = this.privateKey
    keypair.publicKey = this.publicKey
    keypair.certificate = this.certificate
    return keyproto.Keypair.encode(keypair)
  }
}
let createKeypair = (cb)=> {
  try {
    let keys = forge.pki.rsa.generateKeyPair(2048)
    let cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '01'
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2)
    let attrs = [ {
      name: 'commonName',
      value: 'localhost'
    }, {
      name: 'countryName',
      value: 'US'
    }, {
      shortName: 'ST',
      value: 'California'
    }, {
      name: 'localityName',
      value: 'San Francisco'
    }, {
      name: 'organizationName',
      value: 'none'
    }, {
      shortName: 'OU',
      value: 'none'
    } ]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.sign(keys.privateKey)

    let certificate = forge.pki.certificateToPem(cert)
    let privateKey = forge.pki.publicKeyToPem(keys.publicKey)
    let publicKey = forge.pki.privateKeyToPem(keys.privateKey)
    process.nextTick(()=> {
      return cb(null, new Keypair(privateKey, publicKey, certificate))
    })
  } catch (ex) {
    process.nextTick(()=> {
      return cb(ex)
    })
  }

}

let unmarshal = (buf)=> {
  let keypair = keyproto.Keypair.decode(buf)
  return new Keypair(keypair.privateKey, keypair.publicKey, keypair.certificate)
}

module.exports = {
  createKeypair: createKeypair,
  unmarshal: unmarshal
}
