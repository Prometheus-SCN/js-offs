const kb = 1000
const mb = 1000000
const gb = 1000000000
let defaults = {
  blockPath: '.block-cache',
  miniPath: '.mini-cache',
  nanoPath: '.nano-cache',
  blockCacheSize: 200 * gb,
  miniBlockCacheSize: 100 * mb,
  nanoBlockCacheSize: 200 * mb,
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
  numPortTries: 2,// how long to wait on a rpc response
  packetSize: 512, // message size in bytes
  nodeCount: 10, // how many nodes to find in or query in total
  concurrency: 3, // how many nodes to query simultaneously
  kbucketSize: 20, // size of each k bucket
  storeCount: 1, // how many nodes to store new data at
  maxFillRate: 72, // in hours
  redundancy: .30, //30% network redundancy target
  batchConcurrency: 10,
  bootstrap: []
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
class Config {
  constructor () {
    this.loadDefaults()
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
    _nodeCount.set(this, defaults.packetSize)
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

  get miniBlockCacheSize () {
    return _miniBlockCacheSize.get(this)
  }

  get nanoBlockCacheSize () {
    return _nanoBlockCacheSize.get(this)
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

  get startPort () {
    return _startPort.get(this)
  }

  get numPortTries () {
    return _numPortTries.get(this)
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
    return _bootstrap.get(this).slice(0)
  }
}
module.exports = new Config()