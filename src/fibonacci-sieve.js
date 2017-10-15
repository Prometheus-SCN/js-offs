const EventEmitter = require('events').EventEmitter
const cbor = require('cbor-js')
const toAb = require('to-array-buffer')
const abToB = require('arraybuffer-to-buffer')
const CuckooSieve = require('./cuckoo-sieve')

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

let _buckets = new WeakMap()
let _cfSize = new WeakMap()
let _bSize = new WeakMap()
let _fpSize = new WeakMap()
let _scale = new WeakMap()
let _offset = new WeakMap()
module.exports = class FibonacciSieve extends EventEmitter {
  constructor(cfSize, bSize, fpSize, scale, offset) {
    super()
    if (typeof cfSize == 'object') {
      if (!Number.isInteger(cfSize.cfSize)) {
        throw new TypeError('Invalid Filter Size')
      }
      if (!Number.isInteger(cfSize.bSize)) {
        throw new TypeError('Invalid Bucket Size')
      }
      if (!Number.isInteger(cfSize.fpSize)) {
        throw new TypeError('Invalid Fingerprint Size')
      }
      if (!Number.isInteger(cfSize.scale)) {
        throw new TypeError('Invalid Scale')
      }
      if (!Array.isArray(cfSize.buckets)) {
        throw new TypeError('Invalid Fibonacci Buckets')
      }
      _buckets.set(this, cfSize.buckets)
      _fpSize.set(this, cfSize.fpSize)
      _bSize.set(this, cfSize.bSize)
      _cfSize.set(this, cfSize.cfSize)
      _scale.set(this, cfSize.scale)
      _offset.set(this, cfSize.offset || 0)

    } else {
      if (!Number.isInteger(cfSize)) {
        throw new TypeError('Invalid Filter Size')
      }
      if (!Number.isInteger(bSize)) {
        throw new TypeError('Invalid Bucket Size')
      }
      if (!Number.isInteger(fpSize)) {
        throw new TypeError('Invalid Fingerprint Size')
      }
      if (!Number.isInteger(scale)) {
        throw new TypeError('Invalid Scale')
      }
      _buckets.set(this, [])
      _fpSize.set(this, fpSize)
      _bSize.set(this, bSize)
      _cfSize.set(this, cfSize)
      _scale.set(this, scale)
      _offset.set(this, offset || 0)
    }
  }
  promote (from, to, item) {
    let buckets = _buckets.get(this)
    let scale = _scale.get(this)
    let fpSize = _fpSize.get(this)
    let cfSize = _cfSize.get(this)
    let bSize = _bSize.get(this)
    buckets[ from ].remove(item)
    if (!buckets[ to ]) {
      buckets[ to ] = new CuckooSieve(cfSize, bSize, fpSize, scale)
      buckets[ to ].limit = fibSequence (to)
    }
    return buckets[ to ].tally(item)
  }
  tally (item) {
    let buckets = _buckets.get(this)
    let scale = _scale.get(this)
    let fpSize = _fpSize.get(this)
    let cfSize = _cfSize.get(this)
    let bSize = _bSize.get(this)
    let offset = _offset.get(this)
    let number = offset
    for (let i = buckets.length - 1; i >= offset; i--) {
      let bucket = buckets[ i ]
      if (bucket && bucket.rank(item)) {
        number = i
        break
      }
    }
    if (!buckets[ number ]) {
      buckets[ number ] = new CuckooSieve(cfSize, bSize, fpSize, scale)
      buckets[ number ].limit = fibSequence (number)
    }
    if (buckets[ number ].tally(item) >= buckets[ number ].limit) {
      this.promote(number, number + 1, item)
      return true
    }
    return false
  }

  remove (item) {
    let buckets = _buckets.get(this)
    for (let i = buckets.length - 1; i >= 0; i--) {
      let bucket = buckets[ i ]
      if (bucket.remove(item)) {
        break
      }
    }
  }

  get max () {
    let buckets = _buckets.get(this)
    return buckets.length - 1
  }

  number (item) {
    let buckets = _buckets.get(this)
    for (let i = buckets.length - 1; i >= 0; i--) {
      let bucket =  buckets[ i ]
      if (bucket.rank(item)) {
        return i
      }
    }
    return 0
  }

  countAtNumber (number) {
    if (!Number.isInteger(rank)) {
      throw new TypeError("Invalid Number")
    }
    if (number > this.max || number < 0) {
      return 0
    }
    let buckets = _buckets.get(this)
    return buckets[ number ].count
  }

  toJSON () {
    let fpSize = _fpSize.get(this)
    let cfSize = _cfSize.get(this)
    let bSize = _bSize.get(this)
    let scale = _scale.get(this)
    let buckets = _buckets.get(this)
    let offset = _offset.get(this)
    let obj = {
      cfSize: cfSize,
      fpSize: fpSize,
      bSize: bSize,
      scale: scale,
      offse: offset,
      buckets: buckets.map((bucket)=> {
        if (bucket) {
          return bucket.toJSON()
        } else {
          return null
        }
      })
    }
    return obj
  }

  static fromJSON (obj) {
    obj.buckets = obj.buckets.map((bucket, index) => {
      if (bucket) {
        let sieve = CuckooSieve.fromJSON(bucket)
        sieve.limit = fibSequence(index + 1)
        return sieve
      }
      return null
    })
    return new FibonacciSieve(obj)
  }

  toCBOR () {
    let buf = abToB(cbor.encode(this.toJSON()))
    return buf
  }

  static fromCBOR (buf) {
    let obj = cbor.decode(toAb(buf))
    return FibonacciSieve.fromJSON(obj)
  }
}