'use strict'
const EventEmitter = require('events').EventEmitter
const Block = require('./block')
const FibonacciCache = require('./fibonacci-cache')
let _cache = new WeakMap()
let _blockSize = new WeakMap()
let _cacheInterface = new WeakMap()

module.exports =
  class BlockCache extends EventEmitter {
    constructor (path, blockSize, maxSize, cacheInterface) {
      super()
      if (!path || typeof path !== 'string') {
        throw new TypeError('Invalid path')
      }
      if (!Number.isInteger(blockSize)) {
        throw new TypeError('Block size must be an integer')
      }
      if (!Number.isInteger(maxSize)) {
        throw new TypeError('Max size must be an integer')
      }
      if (!cacheInterface) {
        throw new TypeError('Invalid Cache Interface')
      }
      _cacheInterface.set(this, cacheInterface)
      let cache = new FibonacciCache(path, blockSize, maxSize)
      cache.on('promote', (block, number)=> {
        this.emit('promote', block, number)
      })
      cache.on('capacity', (capacity)=> {
        this.emit('capacity', capacity)
      })
      cache.on('full', ()=> {
        this.emit('full')
      })
      _cache.set(this, cache)
      _blockSize.set(this, blockSize)
    }

    get capacity () {
      let cache = _cache.get(this)
      return cache.capacity
    }

    get full () {
      let cache = _cache.get(this)
      return cache.full
    }

    get size () {
      let cache = _cache.get(this)
      return cache.size
    }

    get maxSize () {
      let cache = _cache.get(this)
      return cache.maxSize
    }

    get path () {
      let cache = _cache.get(this)
      return cache.path
    }

    get number () {
      let cache = _cache.get(this)
      return cache.number
    }

    load (keys) {
      keys = keys.filter((key)=> {
        return !this.contains(key)
      })
      let cacheInterface = _cacheInterface.get(this)
      return cacheInterface.load(keys)
    }

    put (block, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }

      if (!(block instanceof Block)) {
        return process.nextTick(()=> {cb(new Error('Invalid Block'))})
      }
      let cache = _cache.get(this)
      cache.put(block, cb)
    }

    get (key, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }
      let cache = _cache.get(this)
      cache.get(key, cb)
    }

    remove (key, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }
      let cache = _cache.get(this)
      cache.remove(key, cb)
    }

    randomBlocks (number, usageFilter, items, cb) {
      let blockSize = _blockSize.get(this)
      let cache = _cache.get(this)
      cache.randomBlocks(number, usageFilter, items, (err, items, blocks)=> {
        if (err) {
          return process.nextTick(()=> {
            return cb(err)
          })
        }

        if (blocks.length < number) {
          let i = -1
          let stop = number - blocks.length
          let next = ()=> {
            i++
            if (i < stop) {
              let block = Block.randomBlock(blockSize)
              while (cache.contains(block.key)) {
                block = Block.randomBlock(blockSize)
              }
              this.emit('block', block)
              this.put(block, (err)=> {
                if (err) {
                  return process.nextTick(()=> {
                    return cb(err)
                  })
                }

                blocks.push(block)

                return next()
              })
            } else {
              return process.nextTick(()=> {
                return cb(null, items, blocks)
              })
            }
          }
          next()
        } else {
          return process.nextTick(()=> {
            return cb(null, items, blocks)
          })
        }
      })
    }

    storeBlockAt (block, number, cb) {
      let cache = _cache.get(this)
      cache.storeBlockAt(block, number, cb)
    }

    randomBlockAt (number, usageFilter, cb) {
      let cache = _cache.get(this)
      cache.randomBlockAt(number, usageFilter, cb)
    }

    closestBlockAt (number, key, usageFilter, cb) {
      let cache = _cache.get(this)
      cache.closestBlockAt(number, key, usageFilter, cb)
    }

    contains (key) {
      let cache = _cache.get(this)
      return cache.contains(key)
    }

    containsAt (number, key) {
      let cache = _cache.get(this)
      return cache.containsAt(number, key)
    }

    contentFilter (cb) {
      let cache = _cache.get(this)
      cache.contentFilter(cb)
    }

    content (cb) {
      let cache = _cache.get(this)
      cache.content(cb)
    }

    get capacity () {
      let cache = _cache.get(this)
      return cache.capacity
    }
  }
