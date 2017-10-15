'use strict'
const EventEmitter = require('events').EventEmitter
const pth = require('path')
const mkdirp = require('mkdirp')
const config = require('./config')
const FibonacciSieve = require('./fibonacci-sieve')
const Block = require('./block')
const util = require('./utility')
const fs = require('fs')
const getSize = require('get-folder-size')
let _cacheInterface = new WeakMap()
let _path = new WeakMap()
let _dirty = new WeakMap()
let _blockSize = new WeakMap()
let _fibonacciSieve = new WeakMap()
let _contentFilter = new WeakMap()
let _sizeTimer = new WeakMap()
let _size = new WeakMap()
let _maxSize = new WeakMap()
let _dirtyTimer = new WeakMap()

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

      // Load Fibonacci Sieve
      let fc = pth.join(path, '.sieve')
      let fibonacciSieve
      try {
        let contCBOR = fs.readFileSync(fc)
        fibonacciSieve = FibonacciSieve.fromCBOR(contCBOR)
      } catch (ex) {
        fibonacciSieve = new FibonacciSieve(config.filterSize, config.bucketSize, config.fingerprintSize, config.scale)
        this.dirty = true
      }
      _fibonacciSieve.set(this, fibonacciSieve)

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

    get size () {
      return _size.get(this)
    }

    get capacity () {
      return 100 * (this.size / this.maxSize)
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

    //  Dirty triggers a debounced save of the fibonacci sieve
    set dirty (value) {
      if (value === true) {
        _dirty.set(this, true)
        if (_contentFilter.has(this)) {
          _contentFilter.delete(this)
        }
        let dirtyTimer = _dirtyTimer.get(this)
        clearTimeout(dirtyTimer)
        dirtyTimer = setTimeout(()=> {
          this.save(()=> {
          })
        }, 500)
        _dirtyTimer.set(this, dirtyTimer)
      } else {
        _dirty.set(this, false)
      }
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
      keys = keys.filter((key)=> {
        return !this.contains(key)
      })
      let cacheInterface = _cacheInterface.get(this)
      return cacheInterface.load(keys)
    }

    put (block, cb) {
      let fd = util.sanitize(block.key, this.path)
      if (this.full) {
        return cb(new Error("Block Cache is full"))
      }

      fs.writeFile(fd, block.data, (err)=> {
        if (!err) {
          let fibonacciSieve = _fibonacciSieve.get(this)
          if (fibonacciSieve.tally(block.key)) {
            this.emit('promote', block, fibonacciSieve.number(block.key))
          }
          this.dirty = true
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
          let fibonacciSieve = _fibonacciSieve.get(this)
          let block = new Block(buf, blockSize)
          if (fibonacciSieve.tally(block.key)) {
            this.emit('promote', block, fibonacciSieve.number(block.key))
          }
          this.dirty = true
          return cb(null, block)
        }
      })
    }

    remove (key, cb) {
      let fd = util.sanitize(key, this.path)
      fs.unlink(fd, (err) => {
        if (!err) {
          let fibonacciSieve = _fibonacciSieve.get(this)
          fibonacciSieve.remove(key)
          this.dirty = true
          let blockSize = _blockSize.get(this)
          //approximation of size whilst dodging i/o to fs
          _size.set(this, (this.size - blockSize))
          this.updateSize()
        }
        return cb(err)
      })
    }

    save (cb) {
      let path = _path.get(this)
      let fibonacciSieve = _fibonacciSieve.get(this)
      let fd = pth.join(path, '.sieve')
      fs.writeFile(fd, fibonacciSieve.toCBOR(), (err)=> {
        if (err) {
          return cb(err)
        }
        this.dirty = false
        return cb()
      })
    }

    content (cb) {
      fs.readdir(this.path, (err, items)=> {
        if (err) {
          return cb(err)
        }
        //remove the fibonacci sieve from the results
        let index = items.findIndex((item) => item === '.sieve')
        if (index !== -1) {
          items.splice(index, 1)
        }
        return cb(err, items)
      })
    }

    contentFilter (cb) {
      let contentFilter = _contentFilter.get(this)
      if (contentFilter) {
        return cb(null, contentFilter)
      } else {
        this.content((err, content) => {
          if (!err) {
            _contentFilter.set(this, content)
          }
          return cb(err, content)
        })
      }
    }

    randomBlockList (number, cb) {
      let blockSize = _blockSize.get(this)
      let fibonacciSieve = _fibonacciSieve.get(this)
      this.content((err, content) => {
        if (err) {
          return cb(err)
        }
        let buckets = []
        content.forEach((key) => {
          let number = fibonacciSieve.number(key)
          if (!buckets[ number ]) {
            buckets[ number ] = []
          }
          buckets[ number ].push(key)
        })
        let randoms = []
        for (let i = buckets.length - 1; i >= 0; i--) {
          let bucket = buckets[ i ] || []
          while (bucket.length) {
            randoms.push(bucket.splice(util.getRandomInt(0, bucket.length - 1), 1)[ 0 ])
            if (randoms.length >= number) {
              return cb(null, randoms)
            }
          }
        }

        if (randoms.length < number) {
          let i = -1
          let stop = number - randoms.length
          let next = () => {
            i++
            if (i < stop) {
              let block = Block.randomBlock(blockSize)
              this.emit('block', block)
              this.put(block, (err) => {
                if (err) {
                  return cb(err)
                }
                randoms.push(block)
                return next()
              })
            } else {
              return cb(null, randoms)
            }
          }
          next()
        }
      })
    }

    storeBlockAt (block, number, cb) {
      let fibonacciSieve = _fibonacciSieve.get(this)
      this.put(block, (err) => {
        if (err) {
          return cb(err)
        }
        fibonacciSieve.promote(fibonacciSieve.number(block.key), number)
        return cb()
      })
    }

    contains (key) {
      let fibonacciSieve = _fibonacciSieve.get(this)
      return !!fibonacciSieve.number(key)
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
      this.content((err, content) => {
        if (err) {
          return cb(err)
        }
        let buckets = []
        let hash = new Buffer(bs58.decode(key))
        content.forEach((key) => {
          let number = fibonacciSieve.number(key)
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