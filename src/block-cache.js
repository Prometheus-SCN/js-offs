'use strict'
const fs = require('fs')
const Block = require('./block')
const FibonacciCache = require('./fibonacci-cache')
let _cache = new WeakMap()
let _blockSize = new WeakMap()

module.exports =
  class BlockCache {
    constructor (path, blockSize) {
      if (!path || typeof path !== 'string') {
        throw new Error('Invalid path')
      }
      if(!Number.isInteger(blockSize)){
        throw new Error('Block size must be an integer')
      }
      _cache.set(this, new FibonacciCache(path, blockSize))
      _blockSize.set(this, blockSize)
    }

    get path () {
      let cache = _cache.get(this)
      return cache.path
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

  }
