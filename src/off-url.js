const urlencode = require('urlencode')
let _serverAddress = new WeakMap()
let _applicationPath = new WeakMap()
let _contentType = new WeakMap()
let _hash = new WeakMap()
let _streamLength = new WeakMap()
let _fileHash = new WeakMap()
let _descriptorHash = new WeakMap()
let _tupleBlock1 = new WeakMap()
let _tupleBlock2 = new WeakMap()
let _tupleBlock3 = new WeakMap()
let _streamOffset = new WeakMap()
let _streamOffsetLength = new WeakMap()
let _fileName = new WeakMap()
let _version = new WeakMap()
const _regEx = /\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([^ !$`&*()+]*|\\[ !$`&*()+]*)+/
module.exports = class OffUrl {
  constructor (options) {
    _serverAddress.set(this, 'http://localhost:23402')
    _applicationPath.set(this, 'offsystem')
    _contentType.set(this, 'application/octet-stream')
    _streamOffset.set(this, 0)
    _streamOffsetLength.set(this, 0)
    _streamLength.set(this, 0)
    _version.set(this, 'v3')
  }

  toString () { // this is a version 3 url
    return [ this.serverAddress, this.applicationPath, this.version, this.contentType, this.streamLength, this.fileHash, this.descriptorHash, urlencode(this.fileName) ].join('/')
  }

  get serverAddress () {
    return _serverAddress.get(this)
  }

  set serverAddress (value) {
    if (typeof value !== 'string') {
      throw new Error('Server address must be a string')
    }
    _serverAddress.set(this, value)
  }

  get applicationPath () {
    return _applicationPath.get(this)
  }

  set applicationPath (value) {
    if (typeof value !== 'string') {
      throw new Error('Application path must be a string')
    }
    _applicationPath.set(this, value)
  }

  get contentType () {
    return _contentType.get(this)
  }

  set contentType (value) {
    if (typeof value !== 'string') {
      throw new Error('Content type must be a string')
    }
    _contentType.set(this, value)
  }

  get streamLength () {
    return _streamLength.get(this)
  }

  set streamLength (value) {
    if (!Number.isInteger(value)) {
      throw new Error('Stream length must be an integer')
    }
    _streamLength.set(this, value)
  }

  get hash () {
    return _hash.get(this)
  }

  set hash (value) {
    if (typeof value !== 'string') {
      throw new Error('Hash must be a string')
    }
    _hash.set(this, value)
  }

  get fileHash () {
    return _fileHash.get(this)
  }

  set fileHash (value) {
    if (typeof value !== 'string') {
      throw new Error('File hash must be a string')
    }
    _fileHash.set(this, value)
  }

  get descriptorHash () {
    return _descriptorHash.get(this)
  }

  set descriptorHash (value) {
    if (typeof value !== 'string') {
      throw new Error('Descriptor hash must be a string')
    }
    _descriptorHash.set(this, value)
  }

  get tupleBlock1 () {
    return _tupleBlock1.get(this)
  }

  set tupleBlock1 (value) {
    if (typeof value !== 'string') {
      throw new Error('First tuple must be a string')
    }
    _tupleBlock1.set(this, value)
  }

  get tupleBlock2 () {
    return _tupleBlock1.get(this)
  }

  set tupleBlock2 (value) {
    if (typeof value !== 'string') {
      throw new Error('Second tuple must be a string')
    }
    _tupleBlock2.set(this, value)
  }

  get tupleBlock3 () {
    return _tupleBlock3.get(this)
  }

  set tupleBlock3 (value) {
    if (typeof value !== 'string') {
      throw new Error('Third tuple must be a string')
    }
    _tupleBlock3.set(this, value)
  }

  get streamOffset () {
    return _streamOffset.get(this) || 0
  }

  set streamOffset (value) {
    if (!Number.isInteger(value)) {
      throw new Error('Stream offset must be an integer')
    }
    _streamOffset.set(this, value)
  }

  get streamOffsetLength () {
    return _streamOffsetLength.get(this) || this.streamLength
  }

  set streamOffsetLength (value) {
    if (!Number.isInteger(value)) {
      throw new Error('Stream offset length must be an integer')
    }
    _streamOffsetLength.set(this, value)
  }

  get fileName () {
    return _fileName.get(this)
  }

  set fileName (value) {
    if (typeof value !== 'string') {
      throw new Error('File name must be a string')
    }
    _fileName.set(this, value)
  }

  get version () {
    return _version.get(this)
  }

  set version (value) {
    if (typeof value !== 'string') {
      throw new Error('version must be a string')
    }
    _version.set(this, value)
  }

  static parse (url) {
    if (typeof url !== 'string') {
      throw new Error('url must be a string')
    }
    let matches = url.match(_regEx)
    if (matches) {
      let url = new OffUrl()
      url.contentType = matches[ 1 ]
      url.streamLength = parseInt(matches[ 2 ])
      url.fileHash = matches[ 3 ]
      url.descriptorHash = matches[ 4 ]
      url.fileName = matches[ 5 ]
      return url
    } else {
      throw new Error('Invalid url')
    }
  }

  static get regEx () {
    return _regEx
  }
}
