'use strict'
const fs = require('fs')
const ScalableCuckooFilter = require('cuckoo-filter').ScalableCuckooFilter
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const FibonacciBucket = require('./fibonacci-bucket')
const mkdirp = require('mkdirp')
let _buckets = new WeakMap()
let _path = new WeakMap()
let _blockSize = new WeakMap()
let EventEmitter = require('events').EventEmitter
module.exports = class FibonacciCache extends EventEmitter {
  constructor (path, blockSize) {
    super()
    if (!path || typeof path !== 'string') {
      throw new TypeError('Invalid path')
    }
    if(!Number.isInteger(blockSize)){
      throw new Error('Block size must be an integer')
    }
    _blockSize.set(this, blockSize)
    _path.set(this, path)
    mkdirp.sync(path)
    let items = fs.readdirSync(path)
    let buckets = []
    for (let i = 0; i < items.length; i++) {
      let reg = /.f([\d]+)/g
      let results = reg.exec(items[ i ])
      if (results) {
        buckets.push(new FibonacciBucket(path, blockSize, parseInt(results[ 1 ])))
      }
    }
    _buckets.set(this, buckets)
  }

  get path () {
    return _path.get(this).slice(0)
  }

  get dirty () {
    let buckets = _buckets.get(this)
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[ i ].dirty) {
        return true
      }
    }
    return false
  }

  save (cb) {
    let buckets = _buckets.get(this)
    let i = -1
    let next = (err)=> {
      if (err) {
        return process.nextTick(()=> { return cb(err)})
      }
      i++
      if (i < buckets.length) {
        let bucket = buckets[ i ]
        if (bucket.dirty) {
          return bucket.save(next)
        }
        else {
          return next()
        }
      } else {
        return process.nextTick(cb)
      }
    }
    next()
  }

  contains (key) {
    let buckets = _buckets.get(this)
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[ i ].contains(key)) {
        return true
      }
    }
    return false
  }

  put (block, cb) {
    let buckets = _buckets.get(this)
    let blockSize= _blockSize.get(this)

    let index = buckets.findIndex((bucket)=> {return bucket.contains(block.key)})
    let found = buckets[ index ]
    if (!found) {
      if (buckets.length === 0) {
        buckets.push(new FibonacciBucket(this.path, blockSize))
      }
      let bucket = buckets[ 0 ]
      return bucket.put(block, (err)=> {
        if (err) {
          return process.nextTick(()=> {
            return cb(err)
          })
        }
        if (bucket.tally(block.key)) {
          return this.promote(block, 0, (err)=> {
            if (err) {
              return process.nextTick(()=> {return cb(err)})
            }
            return process.nextTick(cb)
          })
        } else {
          return process.nextTick(cb)
        }
      })
    } else {
      if (found.tally(block.key)) {
        return this.promote(block, index, (err)=> {
          if (err) {
            return process.nextTick(()=> {return cb(err)})
          }
          return process.nextTick(cb)
        })
      } else {
        return process.nextTick(cb)
      }
    }
  }

  get (key, cb) {
    let buckets = _buckets.get(this)
    let i = buckets.length
    let next = (err, block)=> {
      if (err) {
        return process.nextTick(()=> {
          return cb(err)
        })
      }
      if (block) {
        if (buckets[ i ].tally(block.key)) {
          return this.promote(block, i, (err)=> {
            if (err) {
              return process.nextTick(()=> {return cb(err, block , (i+1))})
            }
            return process.nextTick(()=> {
              return cb(null, block, (i+1))
            })
          })
        } else {
          return process.nextTick(()=> {
            return cb(null, block, (i+1))
          })
        }
      }

      i--
      if (i <= -1) {
        return process.nextTick(()=> {
          cb(new Error('Block not found'))
        })
      } else {
        if (buckets[ i ].contains(key)) {
          return buckets[ i ].get(key, next)
        }
        else {
          return process.nextTick(next)
        }
      }
    }
    next()
  }

  remove (key, cb) {
    let buckets = _buckets.get(this)
    let i = buckets.length
    let next = (err)=> {
      if (err) {//TODO: Make a case for false positives
        return process.nextTick(()=> {
          cb(err)
        })
      }
      i--
      if (i <= 0) {
        return process.nextTick(()=> {
          cb(new Error('Block not found'))
        })
      } else {
        if (buckets[ i ].contains(key)) {
          return buckets[ i ].remove(key, cb)
        }
        else {
          return process.nextTick(next)
        }
      }
    }
    next()
  }

  promote (block, index, cb) {
    let buckets = _buckets.get(this)
    let blockSize = _blockSize.get(this)
    buckets[ index ].unTally(block.key)
    if (!buckets[ index + 1 ]) {
      let path = _path.get(this)
      buckets[ index + 1 ] = new FibonacciBucket(path, blockSize, index + 2)
    }
    buckets[ index ].remove(block.key, (err)=> {
      if (err) {
        return process.nextTick(()=> {
          return cb(new Error("Promotion Failed"))
        })
      }
      buckets[ index + 1 ].put(block, (err)=> {
        if (err) {
          return process.nextTick(()=> {
            return cb(new Error("Promotion Failed"))
          })
        }
        this.emit('promote', block)
        return process.nextTick(cb)
      })
    })
  }

  randomBlocks (number, usageFilter, items, cb) {
    if (typeof items === 'function') {
      cb = items
      items = null
    }
    let buckets = _buckets.get(this)

    let i = buckets.length
    let prior = []
    if (items && typeof items === 'object') {
      i = items.bucket + 1
      items = items.items
    }
    let next = (err, items, blocks) => {
      if (err) {
        return process.nextTick(()=> {cb(err)})
      }
      if (blocks) {
        if ((blocks.length + prior.length) >= number) {
          blocks = prior.concat(blocks)
          return process.nextTick(()=> {
            return cb(null, { bucket: i, items: items }, blocks)
          })
        }
        else {
          prior = prior.concat(blocks)
          number -= blocks.length
        }
      }
      i--
      if (i >= 0) {
        let bucket = buckets[ i ]
        bucket.randomBlocks(number, usageFilter, items, next)
      } else {
        return process.nextTick(()=> {
          return cb(null, { bucket: i, items: items }, blocks || [])
        })
      }
    }
    next(null, items, null)
  }
  storeBlockAt(block, number, cb){
    let index = number-1
    if( 0 > index){
      return process.nextTick(()=>{return cb(new TypeError("Invalid Fibonacci Number"))})
    }
    let buckets = _buckets.get(this)
    let blockSize = _blockSize.get(this)
    let current = -1
    let saveBlock = (err)=>{
      if(err){
        return process.nextTick(()=>{return cb(err)})
      }
      if (!buckets[index]) {
        let path = _path.get(this)
        for (let i= buckets.length; i <= index; i++){
          buckets[ i ] = new FibonacciBucket(path, blockSize, i + 2)
        }
      }
      buckets[ index ].put(block, (err)=> {
        if (err) {
          return process.nextTick(()=> {
            return cb(new Error("Store Failed"))
          })
        }
        return process.nextTick(cb)
      })

    }
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[ i ].contains(key)) {
        current = i
        break
      }
    }
    if (current > -1) {
      if(current >= index){
        return process.nextTick(cb)
      }
      buckets[ current ].unTally(block.key)
      buckets[ current ].remove(block.key, saveBlock)
    } else{
      saveBlock()
    }
  }

  randomBlockAt (number, usageFilter, cb) {
    let buckets = _buckets.get(this)
    if (number instanceof ScalableCuckooFilter || number instanceof CuckooFilter) {
      usageFilter = number
      number = buckets.length
    }
    if (typeof usageFilter === 'function') {
      cb = usageFilter
      usageFilter = null
    }
    if (!usageFilter) {
      return process.nextTick(()=> {return cb(new Error("Invalid usage filter"))})
    }

    if (number > buckets.length) {
      return process.nextTick(()=> {return cb(new Error("Bucket number exceeds number of buckets"))})
    }
    if (number < 1) { // if it is zero then pull from the largest bucket since 0 is not a valid number
      number = buckets.length
    }
    let bucket = buckets[ (number - 1) ]
    bucket.randomBlocks(1, usageFilter, (err, items, blocks)=> {
      if (err) {
        return process.nextTick(()=> {cb(err)})
      }
      let block
      if (blocks.length > 0) {
        block = blocks[ 0 ]
      }
      return process.nextTick(()=> {cb(err, number, block)})
    })
  }
}