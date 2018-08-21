'use strict'
const EventEmitter = require('events').EventEmitter
const pth = require('path')
const mkdirp = require('mkdirp')
const config = require('./config')
const Block = require('./block')
const util = require('./utility')
const fs = require('fs')
const getSize = require('get-folder-size')
const bs58 = require('bs58')
const hamming = require('hamming-distance')
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const CuckooHitCounter = require('cuckoo-hit-counter')
let _cacheInterface = new WeakMap()
let _path = new WeakMap()
let _dirty = new WeakMap()
let _dirtyTimer = new WeakMap()
let _blockSize = new WeakMap()
let _contentFilter = new WeakMap()
let _sizeTimer = new WeakMap()
let _size = new WeakMap()
let _maxSize = new WeakMap()
let _content = new WeakMap()



module.exports =
  class BlockCache extends EventEmitter {
    constructor (path, blockSize, maxSize, cacheInterface) {
      super()
      if (!path || typeof path !== 'string') {
        throw new TypeError('Invalid path')
      }
      if (!Number.isInteger(blockSize)) {
        throw new Error('Block size must be an integer')
      }
      if (!Number.isInteger(maxSize)) {
        throw new TypeError('Max size must be an integer')
      }
      if (!cacheInterface) {
        throw new TypeError('Invalid Cache Interface')
      }
      _maxSize.set(this, maxSize)
      _blockSize.set(this, blockSize)
      _cacheInterface.set(this, cacheInterface)
      _blockSize.set(this, blockSize)
      _dirty.set(this, false)
      mkdirp.sync(path)
      _path.set(this, path)
      let content
      try {
        content = fs.readFileSync(pth.join(path, '.content'))
        content = CuckooHitCounter.fromCBOR(content)
      } catch (ex) {
        content = new CuckooHitCounter(config.counterSize, config.bucketSize, config.fingerprintSize)
        this.dirty = true
      }
      _content.set(this, content)
      content.on('promote', (data) => { this.emit('promote', data.key, data.rank)})

      // TODO: Possibly deasync this call
      // Get the current size of the cache
      getSize(path, (err, size) => {
        if (err) {
          return _size.set(this, 0)
        }
        _size.set(this, size)
        this.emit('capacity', this.capacity)
        if (this.full) {
          this.emit('full')
        }
      })
    }

    get dirty () {
      return _dirty.get(this)
    }

    set dirty (value) {
      if (value === true) {
        _dirty.set(this, true)
        let dirtyTimer = _dirtyTimer.get(this)
        clearTimeout(dirtyTimer)
        dirtyTimer = setTimeout(() => {
          this.save(() => {})
        }, 500)
        _dirtyTimer.set(this, dirtyTimer)
      } else {
        _dirty.set(this, false)
      }
    }

    save (cb) {
      let path = _path.get(this)
      let content = _content.get(this)
      let fd = pth.join(path, '.content')
      fs.writeFile(fd, content.toCBOR(), (err)=> {
        if (err) {
          return process.nextTick(()=> { return cb(err)})
        }
      })
    }

    get size () {
      return _size.get(this)
    }

    get capacity () {
      return 100 * ((this.size || 0) / this.maxSize)
    }

    get full () {
      return this.size >= this.maxSize
    }

    get maxSize () {
      return _maxSize.get(this)
    }

    get path () {
      return _path.get(this).slice(0)
    }

    get number () {
      let buckets = _buckets.get(this)
      return buckets.length
    }

    get dirty () {
      return _dirty.get(this)
    }

    updateSize () {
      let sizeTimer = _sizeTimer.get(this)
      clearTimeout(sizeTimer)//dodge trip to fs when continuously writing or removing
      sizeTimer = setTimeout(()=> {
        getSize(this.path, (err, size) => {
          if (!err) {
            _size.set(this, size)
            this.emit('capacity', this.capacity)
            if (this.full) {
              this.emit('full')
            }
          }
        })
      }, 500)
      _sizeTimer.set(this, sizeTimer)
    }

    load (keys) {
      let cacheInterface = _cacheInterface.get(this)
      return cacheInterface.load(keys)
    }

    put (block, cb) {
      let fd = util.sanitize(block.key, this.path)
      if (this.full) {
        return cb(new Error("Block Cache is full"))
      }

      let content = _content.get(this)
      content.increment(block.key)
      this.dirty = true

      fs.writeFile(fd, block.data, (err)=> {
        if (!err) {
          // used as a size approximation whilst dodging i/o to fs
          _size.set(this, (this.size + block.length))
          this.updateSize()
        }
        return cb(err)
      })
    }

    get (key, cb) {
      let fd = util.sanitize(key, this.path)
      fs.readFile(fd, (err, buf) => {
        if (err) {
          return cb(err)
        } else {
          let blockSize = _blockSize.get(this)
          let block = new Block(buf, blockSize)
          let content = _content.get(this)
          content.increment(key) // Using Block.key would cause it to actually hash itself this is faster and less memory
          this.dirty = true
          return cb(null, block)
        }
      })
    }

    remove (key, cb) {
      let fd = util.sanitize(key, this.path)
      fs.unlink(fd, (err) => {
        if (!err) {
          let blockSize = _blockSize.get(this)
          //approximation of size whilst dodging i/o to fs
          _size.set(this, (this.size - blockSize))
          this.updateSize()
          let content = _content.get(this)
          content.remove(key)
          this.dirty = true
        }
        return cb(err)
      })
    }

    contains(key, cb) {
      let fd = util.sanitize(key, this.path)
      fs.access(fd, (err) => cb(!err))
    }

    content (cb) {
      fs.readdir(this.path, (err, items) => {
        if (err) {
          return cb(err)
        }
        return cb(err, items)
      })
    }

    contentFilterCBOR (cb) {
      let content = _content.get(this)
      return cb(null, content.toCuckooFilterCBOR())
    }
    rank (key) {
      let content = _content.get(this)
      return content.rank(key)
    }

    randomBlock(cb) {
      let blockSize = _blockSize.get(this)
      let block = Block.randomBlock(blockSize)
      this.emit('block', block, 1)
      this.put(block, (err) => {
        if (err) {
          return cb(err)
        }
        return cb(null, block)
      })
    }

    randomBlockList (number, cb) {
      let blockSize = _blockSize.get(this)
      this.content((err, contents) => {
        if (err) {
          return cb(err)
        }

        let content = _content.get(this)
        let randoms = []
        for (let key of contents) {
          if (key === '.content') {
            continue
          }

          let rank = content.rank(key)
          if (!randoms[rank]) {
            randoms[rank] = []
          }

          let index = util.getRandomInt(0, randoms[rank].length)
          randoms[rank].splice(index, 0, key)
        }

        let concat = []
        randoms = concat.concat(...randoms)

        if (randoms.length > number) {
          randoms = randoms.slice(0, number - 1)
        }
        return cb(null, randoms)
      })
    }

    storeBlockAt (block, rank, cb) {
      let content = _content.get(this)
      this.put(block, (err) => {
        if (err) {
          return cb(err)
        }
        content.promote(block.key, rank)
        return cb()
      })
    }

    promote (key, rank, cb) {
      let content = _content.get(this)
      return content.promote(key, rank)
    }

    get maxRank () {
      let content = _content.get(this)
      return content.maxRank
    }

    closestBlock(key, filter, cb) { // TODO: Deprecated?
      if (!filter) {
        return cb(new Error("Invalid usage filter"))
      }

      this.content((err, content) => {
        if (err) {
          return cb(err)
        }
        let hash = new Buffer(bs58.decode(key))
        content = content.filter((key) => !filter.contains(key))
        if(!content.length) {
          return cb(new Error('Cache has no new blocks'))
        }
        let sort = (a, b)=> {
          let hashA = new Buffer(bs58.decode(a))
          let hashB = new Buffer(bs58.decode(b))
          return hamming(hashA, hash) - hamming(hashB, hash)
        }
        content.sort(sort)
        return this.get(content[ 0 ], cb)
      })
    }

    closestBlockAt (number, key, usageFilter, cb) {
      if (!usageFilter) {
        return cb(new Error("Invalid usage filter"))
      }
      let fibonacciSieve = _fibonacciSieve.get(this)
      if (number > fibonacciSieve.max) {
        return cb(new Error("Bucket number exceeds number of buckets"))
      }
      if (number < 1) { // if it is zero then pull from the largest bucket since 0 is not a valid number
        number = buckets.length
      }

      let blockSize = _blockSize.get(this)
      this.content((err, contents) => {
        if (err) {
          return cb(err)
        }
        let buckets = []
        let hash = new Buffer(bs58.decode(key))
        let content = _content.get(this)
        contents.forEach((key) => {
          if (key === '.content') {
            return
          }

          let number = content.rank(key)
          if (!buckets[ number ]) {
            buckets[ number ] = []
          }
          if (!usageFilter.contains(key)) {
            buckets[ number ].push(key)
          }
        })
        let sort = (a, b)=> {
          let hashA = new Buffer(bs58.decode(a))
          let hashB = new Buffer(bs58.decode(b))
          return hamming(hashA, hash) - hamming(hashB, hash)
        }
        if (buckets[ number ].length) {
          buckets[ number ].sort(sort)
          return this.get(buckets[ 0 ], cb)
        }
        for (let i = buckets.length; i <= 0; i--) {
          if (buckets[ i ].length) {
            buckets[ i ].sort(sort)
            return this.get(buckets[ 0 ], cb)
          }
        }
        return cb(new Error('Cache has no new blocks'))
      })
    }
  }