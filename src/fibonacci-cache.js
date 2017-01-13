'use strict'
const fs = require('fs')
const ScalableCuckooFilter = require('cuckoo-filter').ScalableCuckooFilter
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const FibonacciBucket = require('./fibonacci-bucket')
const mkdirp = require('mkdirp')
const EventEmitter = require('events').EventEmitter
const config = require('../config')
const getSize = require('get-folder-size')
let _buckets = new WeakMap()
let _path = new WeakMap()
let _blockSize = new WeakMap()
let _sizeTimer = new WeakMap()
let _size = new WeakMap()
let _maxSize = new WeakMap()
let _contentFilter = new WeakMap()
module.exports = class FibonacciCache extends EventEmitter {
  constructor (path, blockSize, maxSize) {
    super()
    if (!path || typeof path !== 'string') {
      throw new TypeError('Invalid path')
    }
    if (!Number.isInteger(blockSize)) {
      throw new Error('Block size must be an integer')
    }
    if (!Number.isInteger(maxSize)) {
      throw new Error('Max size must be an integer')
    }
    _maxSize.set(this, maxSize)
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

    let onDirty = ()=> {
      if (_contentFilter.has(this)) {
        _contentFilter.delete(this)
      }
    }
    this.on('dirty', onDirty)

    //TODO: Possibly deasync this call
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
    let buckets = _buckets.get(this)
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[ i ].dirty) {
        return true
      }
    }
    return false
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

  contentFilter (cb) {
    let content = _contentFilter.get(this)
    if (content) {
      return process.nextTick(()=> {
        return cb(null, content)
      })
    } else {
      let buckets = _buckets.get(this)
      let i = -1
      let keys = []
      let next = (err, items)=> {
        if (err) {
          return process.nextTick(()=> { return cb(err)})
        }
        if (items) {
          keys = keys.concat(items)
        }
        i++
        if (i < buckets.length) {
          let bucket = buckets[ i ]
          bucket.content(next)
        } else {
          // up by 5% to avoid collisions
          let content = new CuckooFilter((keys.length + Math.ceil(keys.length * .05)), config.bucketSize, config.fingerprintSize)
          for (let i = 0; i < keys.length; i++) {
            content.add(keys[ i ])
          }
          _contentFilter.set(this, content)
          return process.nextTick(()=> {
            return cb(null, content)
          })
        }
      }
      next()
    }
  }

  content (cb) {
    let buckets = _buckets.get(this)
    let i = buckets.length
    let keys = []
    let next = (err, items)=> {
      if (err) {
        return process.nextTick(()=> { return cb(err)})
      }
      if (items) {
        keys = keys.concat(items)
      }
      i--
      if (i >= 0) {
        let bucket = buckets[ i ]
        bucket.content(next)
      } else {
        return process.nextTick(()=> {
          return cb(null, keys)
        })
      }
    }
    next()

  }

  contentAt (number, cb) {
    let index = number - 1
    if (0 > index) {
      return false
    }
    let buckets = _buckets.get(this)
    let bucket = buckets[ index ]
    bucket.content(cb)
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
    let blockSize = _blockSize.get(this)

    let index = buckets.findIndex((bucket)=> {return bucket.contains(block.key)})
    let found = buckets[ index ]
    if (!found) {
      if (this.full) {
        return process.nextTick(()=> {
          return cb(new Error("Block Cache is full"))
        })
      }
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
        if (bucket.dirty) {
          this.emit('dirty')
        }
        if (bucket.tally(block.key)) {
          return this.promote(block, 0, (err)=> {
            if (err) {
              return process.nextTick(()=> {return cb(err)})
            }
            this.updateSize()
            return process.nextTick(cb)
          })
        } else {
          //used as a size approximation whilst dodging i/o to fs
          _size.set(this, (this.size + block.length))
          this.updateSize()
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
              return process.nextTick(()=> {return cb(err, block, (i + 1))})
            }
            return process.nextTick(()=> {
              return cb(null, block, (i + 1))
            })
          })
        } else {
          return process.nextTick(()=> {
            return cb(null, block, (i + 1))
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
      if (i <= -1) {
        return process.nextTick(()=> {
          cb(new Error('Block not found'))
        })
      } else {
        if (buckets[ i ].contains(key)) {
          return buckets[ i ].remove(key, (err) => {
            if (!err) {
              let blockSize = _blockSize.get(this)
              //approximation of size whilst dodging i/o to fs
              _size.set(this, (this.size - blockSize))
              this.updateSize()
            }
            if (buckets[ i ].dirty) {
              this.emit('dirty')
            }
            return cb(err)
          })
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
        this.emit('promote', block, (index + 2))
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
      let j = -1
      let tally = (err, cb)=> {
        if (err) {}//TODO: Decide what should happen if this fails; most likely nothing
        if (blocks) {
          j++
          if (j < blocks.length) {
            let block = blocks[ j ]
            if (buckets[ i ].tally(block.key)) {
              return this.promote(block, i, (err)=> {
                return tally(err, cb)
              })
            } else {
              return tally(null, cb)
            }
          } else {
            return cb()
          }
        } else {
          return cb()
        }
      }
      tally(null, ()=> {
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
      })

    }
    next(null, items, null)
  }

  containsAt (number, key) {
    let index = number - 1
    if (0 > index) {
      return false
    }
    let buckets = _buckets.get(this)
    if (number >= buckets.length) {
      return false
    }
    return buckets[ index ].contains(key)
  }

  storeBlockAt (block, number, cb) {
    let index = number - 1
    if (0 > index) {
      return process.nextTick(()=> {return cb(new TypeError('Invalid Fibonacci Number'))})
    }
    let buckets = _buckets.get(this)
    let blockSize = _blockSize.get(this)
    let current = -1
    let saveBlock = (err)=> {
      if (err) {
        return process.nextTick(()=> {return cb(err)})
      }
      if (!buckets[ index ]) {
        let path = _path.get(this)
        for (let i = buckets.length; i < number; i++) {
          buckets[ i ] = new FibonacciBucket(path, blockSize, i + 1)
        }
      }
      if (this.full) {
        return process.nextTick(()=> {
          return cb(new Error("Block Cache is full"))
        })
      }
      buckets[ index ].put(block, (err)=> {
        if (err) {
          return process.nextTick(()=> {
            return cb(new Error("Store Failed"))
          })
        }
        //used as a size approximation whilst dodging i/o to fs
        _size.set(this, (this.size + block.length))
        this.updateSize()
        return process.nextTick(cb)
      })

    }
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[ i ].contains(block.key)) {
        current = i
        break
      }
    }
    if (current > -1) {
      if (current >= index) {
        return process.nextTick(cb)
      }
      buckets[ current ].unTally(block.key)
      buckets[ current ].remove(block.key, saveBlock)
    } else {
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
      this.randomBlocks(1, usageFilter, (err, items, blocks)=> {
        if (err) {
          return process.nextTick(()=> {cb(err)})
        }
        let block
        if (blocks.length > 0) {
          block = blocks[ 0 ]
        }
        number = buckets.findIndex((bucket)=> {return bucket.contains(block.key)})
        return process.nextTick(()=> {cb(err, (number + 1), block)})
      })
    } else {
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

  closestBlockAt (number, key, usageFilter, cb) {
    if (!usageFilter) {
      return process.nextTick(()=> {return cb(new Error("Invalid usage filter"))})
    }
    let buckets = _buckets.get(this)
    if (number > buckets.length) {
      return process.nextTick(()=> {return cb(new Error("Bucket number exceeds number of buckets"))})
    }
    if (number < 1) { // if it is zero then pull from the largest bucket since 0 is not a valid number
      number = buckets.length
    }
    if (number === 0) {
      return process.nextTick(()=> {
        return cb(new Error("Cache is Empty"))
      })
    }
    let bucket = buckets[ (number - 1) ]
    let find = (err, block)=> {
      if (err) {
        if (err.message === 'Bucket has no new blocks') {
          if (number > 1) {
            number--
            bucket = buckets[ (number - 1) ]
            bucket.closestBlockAt(key, usageFilter, find)
          } else {
            return process.nextTick(()=> {cb(new Error('Cache has no new blocks'))})
          }
        } else {
          return process.nextTick(()=> {cb(err)})
        }
      } else {
        return process.nextTick(()=> {cb(err, number, block)})
      }
    }
    bucket.closestBlockAt(key, usageFilter, find)
  }

}