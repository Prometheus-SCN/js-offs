const extend = require('util')._extend
const fs = require('fs')
const path = require('path')
const kb = 1000
const mb = 1000000
const gb = 1000000000
let defaults = {
  blockPath: '.block-cache',
  miniPath: '.mini-cache',
  nanoPath: '.nano-cache',
  blockCacheSize: 10 * gb,
  miniBlockCacheSize: 10 * gb,
  nanoBlockCacheSize: 10 * gb,
  nano: 3,
  block: 1,
  mini: 2,
  tupleSize: 3,
  blockSize: 128000,
  miniBlockSize: 1000,
  nanoBlockSize: 136,
  descriptorPad: 32,
  scale: 2,
  filterSize: 20000,
  fingerprintSize: 8,
  hitBoxSize: 100,
  bucketSize: 4,
  httpPort: 23402,
  startPort: 8200,
  numPortTries: 2,
  nodeCount: 10, // how many nodes to find in or query in total
  concurrency: 3, // how many nodes to query simultaneously
  kbucketSize: 20, // size of each k bucket
  storeCount: 1, // how many nodes to store new data at
  maxFillRate: 72, // in hours
  redundancy: .30, //30% network redundancy target
  batchConcurrency: 10,
  bootstrap: [
    {id: '8fHecNZCiTxavnfnskySbeAYCd1bcv1SAVyi1mcZqurH', ip: '73.135.22.132', port: 8200 }
  ]
}
let _blockPath = new WeakMap()
let _miniPath = new WeakMap()
let _nanoPath = new WeakMap()
let _blockCacheSize = new WeakMap()
let _miniBlockCacheSize = new WeakMap()
let _nanoBlockCacheSize = new WeakMap()
let _nano = new WeakMap()
let _block = new WeakMap()
let _mini = new WeakMap()
let _tupleSize = new WeakMap()
let _blockSize = new WeakMap()
let _miniBlockSize = new WeakMap()
let _nanoBlockSize = new WeakMap()
let _descriptorPad = new WeakMap()
let _scale = new WeakMap()
let _filterSize = new WeakMap()
let _fingerprintSize = new WeakMap()
let _hitBoxSize = new WeakMap()
let _bucketSize = new WeakMap()
let _httpPort = new WeakMap()
let _startPort = new WeakMap()
let _numPortTries = new WeakMap()
let _nodeCount = new WeakMap()
let _concurrency = new WeakMap()
let _kbucketSize = new WeakMap()
let _storeCount = new WeakMap()
let _maxFillRate = new WeakMap()
let _redundancy = new WeakMap()
let _batchConcurrency = new WeakMap()
let _bootstrap = new WeakMap()
let _path = new WeakMap()
class Config {
  constructor () {
  }
  save (pth) {
    if (!pth) {
      pth = _path.get(this)
    }
    _path.set(this, pth)
    fs.writeFile(path.join(pth, 'config'), JSON.stringify(this.toJSON()), (err) => {
      if (err) {
       console.error(err)
       //TODO Dunno what to do with this error
      }
    })
  }
  load (pth) {
    try {
      let config = JSON.parse(fs.readFileSync(path.join(pth, 'config')))
      _path.set(this, pth)
      _blockPath.set(this, config.blockPath)
      _miniPath.set(this, config.miniPath)
      _nanoPath.set(this, config.nanoPath)
      _blockCacheSize.set(this, config.blockCacheSize)
      _miniBlockCacheSize.set(this, config.miniBlockCacheSize)
      _nanoBlockCacheSize.set(this, config.nanoBlockCacheSize)
      _nano.set(this, config.nano)
      _block.set(this, config.block)
      _mini.set(this, config.mini)
      _tupleSize.set(this, config.tupleSize)
      _blockSize.set(this, config.blockSize)
      _miniBlockSize.set(this, config.miniBlockSize)
      _nanoBlockSize.set(this, config.nanoBlockSize)
      _descriptorPad.set(this, config.descriptorPad)
      _scale.set(this, config.scale)
      _filterSize.set(this, config.filterSize)
      _fingerprintSize.set(this, config.fingerprintSize)
      _hitBoxSize.set(this, config.hitBoxSize)
      _bucketSize.set(this, config.bucketSize)
      _httpPort.set(this, config.httpPort)
      _startPort.set(this, config.startPort)
      _numPortTries.set(this, config.numPortTries)
      _nodeCount.set(this, config.nodeCount)
      _concurrency.set(this, config.concurrency)
      _kbucketSize.set(this, config.kbucketSize)
      _storeCount.set(this, config.storeCount)
      _maxFillRate.set(this, config.maxFillRate)
      _redundancy.set(this, config.redundancy)
      _batchConcurrency.set(this, config.batchConcurrency)
      _bootstrap.set(this, config.bootstrap.slice(0))
    } catch (ex) {
      return ex
    }
  }
  loadDefaults () {
    _blockPath.set(this, defaults.blockPath)
    _miniPath.set(this, defaults.miniPath)
    _nanoPath.set(this, defaults.nanoPath)
    _blockCacheSize.set(this, defaults.blockCacheSize)
    _miniBlockCacheSize.set(this, defaults.miniBlockCacheSize)
    _nanoBlockCacheSize.set(this, defaults.nanoBlockCacheSize)
    _nano.set(this, defaults.nano)
    _block.set(this, defaults.block)
    _mini.set(this, defaults.mini)
    _tupleSize.set(this, defaults.tupleSize)
    _blockSize.set(this, defaults.blockSize)
    _miniBlockSize.set(this, defaults.miniBlockSize)
    _nanoBlockSize.set(this, defaults.nanoBlockSize)
    _descriptorPad.set(this, defaults.descriptorPad)
    _scale.set(this, defaults.scale)
    _filterSize.set(this, defaults.filterSize)
    _fingerprintSize.set(this, defaults.fingerprintSize)
    _hitBoxSize.set(this, defaults.hitBoxSize)
    _bucketSize.set(this, defaults.bucketSize)
    _httpPort.set(this, defaults.httpPort)
    _startPort.set(this, defaults.startPort)
    _numPortTries.set(this, defaults.numPortTries)
    _nodeCount.set(this, defaults.nodeCount)
    _concurrency.set(this, defaults.concurrency)
    _kbucketSize.set(this, defaults.kbucketSize)
    _storeCount.set(this, defaults.storeCount)
    _maxFillRate.set(this, defaults.maxFillRate)
    _redundancy.set(this, defaults.redundancy)
    _batchConcurrency.set(this, defaults.batchConcurrency)
    _bootstrap.set(this, defaults.bootstrap.slice(0))
  }

  get blockPath () {
    return _blockPath.get(this)
  }

  get miniPath () {
    return _miniPath.get(this)
  }

  get miniPath () {
    return _miniPath.get(this)
  }

  get blockPath () {
    return _blockPath.get(this)
  }

  get miniPath () {
    return _miniPath.get(this)
  }

  get nanoPath () {
    return _nanoPath.get(this)
  }

  get blockCacheSize () {
    return _blockCacheSize.get(this)
  }

  set blockCacheSize (value) {
    if (!Number.isInteger(+value)) {
      throw new TypeError("Invalid Block Cache Size")
    }
    if (value < 300) {
      throw new TypeError("Block Cache Size Is Too Small")
    }
    if (value > (1000000 * mb)) {
      throw new TypeError("Block Cache Size Is Too Large")
    }
    _blockCacheSize.set(this, value)
    this.save()
  }

  get miniBlockCacheSize () {
    return _miniBlockCacheSize.get(this)
  }

  set miniBlockCacheSize (value) {
    if (!Number.isInteger(+value)) {
      throw new TypeError("Invalid Mini Block Cache Size")
    }
    if (value < 300) {
      throw new TypeError("Mini Block Cache Size Is Too Small")
    }
    if (value > (1000000 * mb)) {
      throw new TypeError("Mini Block Cache Size Is Too Large")
    }
    _miniBlockCacheSize.set(this, value)
    this.save()
  }

  get nanoBlockCacheSize () {
    return _nanoBlockCacheSize.get(this)
  }

  set nanoBlockCacheSize (value) {
    if (!Number.isInteger(+value)) {
      throw new TypeError("Invalid Nano Block Cache Size")
    }
    if (value < 300) {
      throw new TypeError("Nano Block Cache Size Is Too Small")
    }
    if (value > (1000000 * mb)) {
      throw new TypeError("Nano Block Cache Size Is Too Large")
    }
    _nanoBlockCacheSize.set(this, value)
    this.save()
  }

  get nano () {
    return _nano.get(this)
  }

  get block () {
    return _block.get(this)
  }

  get mini () {
    return _mini.get(this)
  }

  get tupleSize () {
    return _tupleSize.get(this)
  }

  get blockSize () {
    return _blockSize.get(this)
  }

  get miniBlockSize () {
    return _miniBlockSize.get(this)
  }

  get nanoBlockSize () {
    return _nanoBlockSize.get(this)
  }

  get descriptorPad () {
    return _descriptorPad.get(this)
  }

  get scale () {
    return _scale.get(this)
  }

  get filterSize () {
    return _filterSize.get(this)
  }

  get fingerprintSize () {
    return _fingerprintSize.get(this)
  }

  get hitBoxSize () {
    return _hitBoxSize.get(this)
  }

  get bucketSize () {
    return _bucketSize.get(this)
  }

  get httpPort () {
    return _httpPort.get(this)
  }

  set httpPort (value) {
    if (!Number.isInteger(+value)){
      throw new TypeError("Invalid HTTP Port")
    }
    _httpPort.set(this, value)
    this.save()
  }

  get startPort () {
    return _startPort.get(this)
  }

  set startPort (value) {
    if (!Number.isInteger(+value)){
      throw new TypeError("Invalid Port Number")
    }
    _startPort.set(this, value)
    this.save()
  }

  get numPortTries () {
    return _numPortTries.get(this)
  }

  set numPortTries (value) {
    if (!Number.isInteger(+value)){
      throw new TypeError("Invalid Number of Port Tries")
    }
    _numPortTries.set(this, value)
    this.save()
  }

  get nodeCount () {
    return _nodeCount.get(this)
  }

  get concurrency () {
    return _concurrency.get(this)
  }

  get kbucketSize () {
    return _kbucketSize.get(this)
  }

  get storeCount () {
    return _storeCount.get(this)
  }

  get maxFillRate () {
    return _maxFillRate.get(this)
  }

  get redundancy () {
    return _redundancy.get(this)
  }

  get batchConcurrency () {
    return _redundancy.get(this)
  }

  get bootstrap () {
    let peers = []
    _bootstrap.get(this).forEach((peer) => {
      let cpy = {}
      extend(cpy, peer)
      peers.push(cpy)
    })
    return peers
  }
  set bootstrap (value) {
    if (!Array.isArray(value)){
      throw new TypeError("Invalid Boostsrap Peer Array")
    }
    _bootstrap.set(this, value)
    this.save()
  }
  toJSON () {
    return {
      blockPath: this.blockPath,
      miniPath: this.miniPath,
      nanoPath: this.nanoPath,
      blockCacheSize: this.blockCacheSize,
      miniBlockCacheSize: this.miniBlockCacheSize,
      nanoBlockCacheSize: this.nanoBlockCacheSize,
      nano: this.nano,
      block: this.block,
      mini: this.mini,
      tupleSize: this.tupleSize,
      blockSize: this.blockSize,
      miniBlockSize: this.miniBlockSize,
      nanoBlockSize: this.nanoBlockSize,
      descriptorPad: this.descriptorPad,
      scale: this.scale,
      filterSize: this.filterSize,
      fingerprintSize: this.fingerprintSize,
      hitBoxSize: this.hitBoxSize,
      bucketSize: this.bucketSize,
      httpPort: this.httpPort,
      startPort: this.startPort,
      numPortTries: this.numPortTries,
      nodeCount: this.nodeCount,
      concurrency: this.concurrency,
      kbucketSize: this.kbucketSize,
      storeCount: this.storeCount,
      maxFillRate: this.maxFillRate,
      redundancy: this.redundancy,
      batchConcurrency: this.batchConcurrency,
      bootstrap: this.bootstrap
    }
  }
}
module.exports = new Config()