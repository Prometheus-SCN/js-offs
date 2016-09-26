const urlencode = require('urlencode')
_serverAddress = new WeakMap()
_applicationPath = new WeakMap()
_contentType = new WeakMap()
_hash = new WeakMap()
_streamLength = new WeakMap()
_fileHash = new WeakMap()
_descriptorHash = new WeakMap()
_tupleBlock1 = new WeakMap()
_tupleBlock2 = new WeakMap()
_tupleBlock3 = new WeakMap()
_streamOffset = new WeakMap()
_streamOffsetLength = new WeakMap()
_fileName = new WeakMap()
_version = new WeakMap()
module.exports = class OffUrl {
  constructor (options) {
    _serverAddress.set(this, 'http://localhost:23402')
    _applicationPath.set(this, 'offsystem')
    _contentType.set(this, 'application/octet-stream')
    _streamOffset.set(this, 0)
    _streamOffsetLength.set(this, 0)
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
      throw new Error("Server address must be a string")
    }
    _serverAddress.set(this, value)
  }

  get applicationPath () {
    return _applicationPath.get(this)
  }

  set applicationPath (value) {
    if (typeof value !== 'string') {
      throw new Error("Application path must be a string")
    }
    _applicationPath.set(this, value)
  }

  get contentType () {
    return _contentType.get(this)
  }

  set contentType (value) {
    if (typeof value !== 'string') {
      throw new Error("Content type must be a string")
    }
    _contentType.set(this, value)
  }

  get streamLength () {
    return _streamLength.get(this)
  }

  set streamLength (value) {
    if (isNaN(value)) {
      throw new Error("Stream length must be a number")
    }
    _streamLength.set(this, value)
  }

  get hash () {
    return _hash.get(this)
  }

  set hash (value) {
    if (typeof value !== 'string') {
      throw new Error("Hash must be a string")
    }
    _hash.set(this, value)
  }

  get fileHash () {
    return _fileHash.get(this)
  }

  set fileHash (value) {
    if (typeof value !== 'string') {
      throw new Error("File hash must be a string")
    }
    _fileHash.set(this, value)
  }

  get descriptorHash () {
    return _descriptorHash.get(this)
  }

  set descriptorHash (value) {
    if (typeof value !== 'string') {
      throw new Error("Descriptor hash must be a string")
    }
    _descriptorHash.set(this, value)
  }

  get tupleBlock1 () {
    return _tupleBlock1.get(this)
  }

  set tupleBlock1 (value) {
    if (typeof value !== 'string') {
      throw new Error("First tuple must be a string")
    }
    _tupleBlock1.set(this, value)
  }

  get tupleBlock2 () {
    return _tupleBlock1.get(this)
  }

  set tupleBlock2 (value) {
    if (typeof value !== 'string') {
      throw new Error("Second tuple must be a string")
    }
    _tupleBlock2.set(this, value)
  }

  get tupleBlock3 () {
    return _tupleBlock3.get(this)
  }

  set tupleBlock3 (value) {
    if (typeof value !== 'string') {
      throw new Error("Third tuple must be a string")
    }
    _tupleBlock3.set(this, value)
  }

  get streamOffset () {
    return _streamOffset.get(this) || 0
  }

  set streamOffset (value) {
    if (!Number.isInteger(value)) {
      throw new Error("Stream offset must be an integer")
    }
    _streamOffset.set(this, value)
  }

  get streamOffsetLength () {
    return _streamOffsetLength.get(this) || this.streamLength
  }

  set streamOffsetLength (value) {
    if (!Number.isInteger(value)) {
      throw new Error("Stream offset length must be an integer")
    }
    _streamOffsetLength.set(this, value)
  }

  get fileName () {
    return _fileName.get(this)
  }

  set fileName (value) {
    if (typeof value !== 'string') {
      throw new Error("File name must be a string")
    }
    _fileName.set(this, value)
  }

  get version () {
    return _version.get(this)
  }

  set version (value) {
    if (typeof value !== 'string') {
      throw new Error("version must be a string")
    }
    _version.set(this, value)
  }

  static fromURL () {

  }
}
