const fs = require('fs')
const util = require('./utility')
const mkdirp = require('mkdirp')
const pth = require('path')
const Cuckoo = require('cuckoo-filter').ScalableCuckooFilter
const Sieve = require('./cuckoo-sieve')
const config = require('../config')
const _contents = new WeakMap()
const _hitBox = new WeakMap()
const _number = new WeakMap()
const _limit = new WeakMap()
const _path = new WeakMap()
function fibSequence (num) {
  let output = 0
  for (var i = 0; i < num; i++) {
    sequence.push(sequence[ 0 ] + sequence[ 1 ])
    sequence.splice(0, 1)
    output = sequence[ 1 ]
  }
  return output
}

module.exports = class FibonacciBucket {
  construct (path, number) {
    if (!number) {
      number = 1
    }
    if (Number.isInteger(number)) {
      throw TypeError('Invalid Path')
    }
    if (typeof path !== 'string') {
      throw TypeError('Invalid Path')
    }
    path = path.join(path, `.f${number}`)
    mkdirp.sync(path)
    _path.set(path)
    _number.set(this, 1)
    _limit.set(this, fibSequence(number + 1))

    let contents = new Cuckoo(config.filterSize, config.bucketSize, config.fingerprintSize, config.scale)

    _contents.set(this, contents)

    let hitBox = new Sieve(800, config.bucketSize, config.fingerprintSize, config.scale)

    _hitBox.set(this, hitBox)
  }

  contains (key) {
    let contents = _contents.get(this)
    return contents.contains(key)
  }

  get number () {
    return _number.get(this)
  }

  get path () {
    return _path.get(this).slice(0)
  }

  tally (block) {
    let hitBox = _hitBox.get(this)
    let limit = _limit.get(this)
    hitBox.tally(block.key)
    if (hitBox.rank(block.key) >= limit) {
      return true
    } else {
      return false
    }
  }

  rank (block) {
    let hitBox = _hitBox.get(this)
    return hitBox.rank(block.key)
  }

  put (block, cb) {
    let fd = util.sanitize(block.key, this.path)
    fs.writeFile(fd, block.data, cb)
  }

  get (key, cb) {
    let fd = util.sanitize(key, this.path)
    fs.readFile(fd, (err, buf) => {
      if (err) {
        return process.nextTick(()=> {cb(err)})
      } else {
        return process.nextTick(()=> {cb(null, new Block(buf))})
      }
    })
  }

  remove (key, cb) {
    let contents = _contents.get(this)
    let fd = util.sanitize(key, this.path)
    fs.unlink(fd, (err) => {
      if(!err){
        contents.remove(key)
      }
      return process.nextTick(()=> {cb(err)})
    })
  }
}