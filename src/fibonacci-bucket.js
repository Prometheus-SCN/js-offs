const fs = require('fs')
const util = require('./utility')
const mkdirp = require('mkdirp')
const pth = require('path')
const Cuckoo = require('cuckoo-filter').ScalableCuckooFilter
const Sieve = require('./cuckoo-sieve')
const config = require('../config')
const Block = require('./block')
const _contents = new WeakMap()
const _hitBox = new WeakMap()
const _number = new WeakMap()
const _limit = new WeakMap()
const _path = new WeakMap()
let _dirty = new WeakMap()
let _blockSize = new WeakMap()
function fibSequence (num) {
  let output = 0
  let sequence = [ 0, 1 ]
  for (var i = 0; i < num; i++) {
    sequence.push(sequence[ 0 ] + sequence[ 1 ])
    sequence.splice(0, 1)
    output = sequence[ 1 ]
  }
  return output
}

module.exports = class FibonacciBucket {
  constructor (path, blockSize, number) {
    if (!number) {
      number = 1
    }
    if (!Number.isInteger(number)) {
      throw TypeError('Invalid Number')
    }
    if (typeof path !== 'string') {
      throw TypeError('Invalid Path')
    }
    if(!Number.isInteger(blockSize)){
      throw new Error('Block size must be an integer')
    }
    path = pth.join(path, `.f${number}`)
    mkdirp.sync(path)
    _path.set(this, path)
    _number.set(this, number)
    _limit.set(this, fibSequence(number + 1))
    _blockSize.set(this, blockSize)

    let fc = pth.join(path, `f${number}.content`)
    let contents
    try {
      let contCBOR = fs.readFileSync(fc)
      contents = Cuckoo.fromCBOR(contCBOR)
    } catch (ex) {
      contents = new Cuckoo(config.filterSize, config.bucketSize, config.fingerprintSize, config.scale)
    }
    _contents.set(this, contents)

    let fh = pth.join(path, `f${number}.content`)
    let hitBox
    try {
      let hitCBOR = fs.readFileSync(fh)
      hitBox = Sieve.fromCBOR(hitCBOR)
    } catch (ex) {
      hitBox = new Sieve(config.hitBoxSize, config.bucketSize, config.fingerprintSize, config.scale)
    }
    _hitBox.set(this, hitBox)
    _dirty.set(this, false)

  }

  contains (key) {
    let contents = _contents.get(this)
    return contents.contains(key)
  }

  get dirty () {
    return _dirty.get(this)
  }

  get number () {
    return _number.get(this)
  }

  get path () {
    return _path.get(this)
  }

  tally (key) {
    let hitBox = _hitBox.get(this)
    let limit = _limit.get(this)
    hitBox.tally(key)
    _dirty.set(this, true)
    if (hitBox.rank(key) >= limit) {
      return true
    } else {
      return false
    }
  }

  unTally (key) {
    let hitBox = _hitBox.get(this)
    hitBox.remove(key)
  }

  rank (block) {
    let hitBox = _hitBox.get(this)
    return hitBox.rank(block.key)
  }

  put (block, cb) {
    let contents = _contents.get(this)
    let fd = util.sanitize(block.key, this.path)
    fs.writeFile(fd, block.data, (err)=> {
      if (!err) {
        _dirty.set(this, true)
        contents.add(block.key)
      }
      return process.nextTick(()=> {cb(err)})
    })
  }

  get (key, cb) {
    let blockSize= _blockSize.get(this)
    let fd = util.sanitize(key, this.path)
    fs.readFile(fd, (err, buf) => {
      if (err) {
        return process.nextTick(()=> {cb(err)})
      } else {
        return process.nextTick(()=> {cb(null, new Block(buf, blockSize))})
      }
    })
  }

  remove (key, cb) {
    let contents = _contents.get(this)
    let fd = util.sanitize(key, this.path)
    fs.unlink(fd, (err) => {
      if (!err) {
        _dirty.set(this, true)
        contents.remove(key)
      }
      return process.nextTick(()=> {cb(err)})
    })

  }

  save (cb) {
    let path = _path.get(this)
    let content = _contents.get(this)
    let fd = pth.join(path, `f${this.number}.content`)
    fs.writeFile(fd, content.toCBOR(), (err)=> {
      if (err) {
        return process.nextTick(()=> { return cb(err)})
      }
      let hitBox = _hitBox.get(this)
      let fd = pth.join(path, `f${this.number}.hitbox`)
      fs.writeFile(fd, hitBox.toCBOR(), (err)=> {
        if (err) {
          return process.nextTick(()=> { return cb(err)})
        }
        _dirty.set(this, true)
        return process.nextTick(cb)
      })
    })

  }

  randomBlocks (number, usageFilter, items, cb) {
    if (typeof items === 'function') {
      cb = items
      items = null
    }
    if (!(usageFilter instanceof Cuckoo)) {
      throw TypeError('Invalid Usage Filter')
    }

    let getRandoms = (err, items)=> {
      if (err) {
        return process.nextTick(()=> {cb(err)})
      }
      let contents = _contents.get(this)
      items = items.filter((item)=> {
        if (item === `f${this.number}.content` || item === `f${this.number}.hitbox`) {
          return false
        }
        contents.add(item)
        return !usageFilter.contains(item)
      })
      if (items.length > 0) {
        let visit = []
        let stop = items.length >= number ? number : items.length
        for (let i = 0; i < stop; i++) {
          let next = util.getRandomInt(0, items.length)
          while (visit.find((num)=> {return next === num})) {
            next = util.getRandomInt(0, items.length)
          }
          visit.push(next)
        }
        let blockArray = []
        let i = -1
        let next = (err, block)=> {
          if (err) {
            return process.nextTick(()=> {cb(err)})
          }

          if (block) {
            blockArray.push(block)
          }

          i++
          if (i < visit.length) {
            usageFilter.add(items[ visit[ i ] ])
            this.get(items[ visit[ i ] ], next)
          } else {
            return process.nextTick(()=> {cb(null, items, blockArray)})
          }
        }
        next()
      } else {
        return process.nextTick(()=> {cb(null, items, [])})
      }
    }
    if (items) {
      getRandoms(null, items)
    } else {
      fs.readdir(this.path, getRandoms)
    }
  }
}