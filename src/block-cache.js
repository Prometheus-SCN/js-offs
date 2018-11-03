'use strict'
const EventEmitter = require('events').EventEmitter
const ExpirationMap = require('./expiration-map')
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
let _cacheInterface = new WeakMap()
let _path = new WeakMap()
let _dirty = new WeakMap()
let _blockSize = new WeakMap()
let _contentFilter = new WeakMap()
let _sizeTimer = new WeakMap()
let _size = new WeakMap()
let _maxSize = new WeakMap()
let _temporary = new WeakMap()
let _assignedTemporary = new WeakMap()
let _gatherTemporaries = new WeakMap()

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
      _temporary.set(this, [])
      _assignedTemporary.set(this, new ExpirationMap(config.temporaryTimeout))
      _gatherTemporaries.set (this, () =>{
        let assignedTemporaries = _assignedTemporary.get(this)
        let temporary = _temporary.get(this)
        let temps = temporary.reduce((acc, val) => acc.concat(val), [])
        for(let temp of assignedTemporaries.values()) {
          temps = temps.concat(temp)
        }
        return temps
      })

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
        let gatherTemporaries = _gatherTemporaries.get(this)
        let temps = gatherTemporaries()
        items = items.filter((item) => !(temps.includes(item)))
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
            contentFilter = new CuckooFilter(content.length, config.bucketSize, config.fingerprintSize)
            for (let key of content){
              contentFilter.add(key)
            }
            _contentFilter.set(this, contentFilter)
          }
          return cb(err, contentFilter)
        })
      }
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
      this.content((err, content) => {
        if (err) {
          return cb(err)
        }

        let randoms = []
        while (content.length) {
          randoms.push(content.splice(util.getRandomInt(0, content.length - 1), 1)[ 0 ])
          if (randoms.length >= number) {
            return cb(null, randoms)
          }
        }
        if (randoms.length > number) {
          randoms = randoms.slice(0, number - 1)
        }
        return cb(null, randoms)
      })
    }

    closestBlock(key, filter, cb) {
      if (!filter) {
        return cb(new Error("Invalid usage filter"))
      }

      this.content((err, content) => {
        if (err) {
          return cb(err)
        }
        let hash = bs58.decode(key)
        content = content.filter((key) => !filter.contains(key))
        if(!content.length) {
          return cb(new Error('Cache has no new blocks'))
        }
        let sort = (a, b)=> {
          let hashA = bs58.decode(a)
          let hashB = bs58.decode(b)
          return hamming(hashA, hash) - hamming(hashB, hash)
        }
        content.sort(sort)
        return this.get(content[ 0 ], cb)
      })
    }

    newTemporary () {
      let temporary = _temporary.get(this)
      let temp = []
      temporary.push(temp)
      return temp
    }

    assignTemporary (key, temp) {
      let temporary = _temporary.get(this)
      let index = temporary.findIndex((arr) => (arr === temp))
      if (index === -1) {
        throw new Error('Invalid Temporary')
      }
      temporary.splice(index, 1)
      let assignedTemporary = _assignedTemporary.get(this)
      assignedTemporary.set(key, temp)
    }

    releaseTemporaries(key) {
      let assignedTemporary = _assignedTemporary.get(this)
      let temps = assignedTemporary.get(key)
      if (temps) {
        i = -1
        let next = (err, block) => {
          if (err) {
            this.emit('error', err)
          }
          if (block) {
            this.emit('block', block)
          }
          i++
          if (i < temps.length) {
            this.get(temps[i], next)
          }
        }
        next()
      }
      assignedTemporary.delete(key)
    }

    removeTemporaries(key, cb) {
      let assignedTemporary = _assignedTemporary.get(this)
      let temps = assignedTemporary.get(key)
      if (temps) {
        let i = -1
        let next = (err) => {
          if (err) {
            return cb(err)
          }
          i++
          if (i < temps.length) {
            return this.remove(temps[i], next)
          } else {
            this.releaseTemporaries(key)
            return cb()
          }
        }
        next()
      }
    }
  }