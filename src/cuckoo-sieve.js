'use strict'
const cbor = require('cbor-js')
const toAb = require('to-array-buffer')
const abToB = require('arraybuffer-to-buffer')
const Cuckoo = require('cuckoo-filter').ScalableCuckooFilter
let _sieve = new WeakMap()
let _cfSize= new WeakMap()
let _bSize= new WeakMap()
let _fpSize = new WeakMap()
let _scale = new WeakMap()
module.exports= class CuckooSieve{
  constructor(cfSize, bSize, fpSize, scale){
    if(typeof cfSize == 'object'){
      if(!Number.isInteger(cfSize.cfSize)){
        throw new TypeError('Invalid Filter Size')
      }
      if(!Number.isInteger(cfSize.bSize)){
        throw new TypeError('Invalid Bucket Size')
      }
      if(!Number.isInteger(cfSize.fpSize)){
        throw new TypeError('Invalid Fingerprint Size')
      }
      if(!Number.isInteger(cfSize.scale)){
        throw new TypeError('Invalid Scale')
      }
      if(!Array.isArray(cfSize.sieve)){
        throw new TypeError('Invalid Sieve')
      }
      _sieve.set(this, cfSize.sieve)
      _fpSize.set(this, cfSize.fpSize)
      _bSize.set(this, cfSize.bSize)
      _cfSize.set(this, cfSize.cfSize)
      _scale.set(this, cfSize.scale)


    } else {
      if(!Number.isInteger(cfSize)){
        throw new TypeError('Invalid Filter Size')
      }
      if(!Number.isInteger(bSize)){
        throw new TypeError('Invalid Bucket Size')
      }
      if(!Number.isInteger(fpSize)){
        throw new TypeError('Invalid Fingerprint Size')
      }
      if(!Number.isInteger(scale)){
        throw new TypeError('Invalid Scale')
      }
      _sieve.set(this, [])
      _fpSize.set(this, fpSize)
      _bSize.set(this, bSize)
      _cfSize.set(this, cfSize)
      _scale.set(this, scale)
    }
  }
  tally(item){
    let sieve = _sieve.get(this)
    let scale = _scale.get(this)
    let fpSize = _fpSize.get(this)
    let cfSize = _cfSize.get(this)
    let bSize = _bSize.get(this)
    let mark= 0
    for(let i = sieve.length-1 ; i >= 0; i--){
      let rank = sieve[i]
      if (rank.contains(item)){
        rank.remove(item)
        mark= i+1
        break;
      }
    }
    if (mark > sieve.length-1){
      sieve.push(new Cuckoo(cfSize, bSize, fpSize, scale))
    }
    sieve[mark].add(item)
  }
  remove(item){
    let sieve = _sieve.get(this)
    for(let i = sieve.length-1 ; i >= 0; i--){
      let rank = sieve[i]
      if (rank.remove(item)){
        break;
      }
    }
  }
  get max(){
    let sieve = _sieve.get(this)
    return sieve.length
  }
  rank(item){
    let sieve = _sieve.get(this)
    for(let i = sieve.length-1 ; i >= 0; i--){
      let rank = sieve[i]
      if (rank.contains(item)){
        return (i + 1)
      }
    }
    return 0
  }
  toString(){
    let sieve = _sieve.get(this)
    let string= ''
    for(let i = 0; i < sieve.length; i++  ){
      let rank = sieve[i]
      if(rank.count > 0){
        if (string === '') {
          string += `Rank ${(i+1)}: ${rank.count}`
        } else {
          string += '\n' + `Rank ${(i+1)}: ${rank.count}`
        }
      }
    }
    return string
  }
  countAtRank(rank){
    if(!Number.isInteger(rank)){
      throw new TypeError("Invalid Rank")
    }
    if (rank < 1){
      throw new TypeError("Rank must be greater than 0")
    }
    let mark = rank-1
    if(mark > this.max || mark < 0){
      return 0
    }
    let sieve = _sieve.get(this)
    return sieve[mark].count
  }

  toJSON () {
    let fpSize = _fpSize.get(this)
    let cfSize = _cfSize.get(this)
    let bSize = _bSize.get(this)
    let scale = _scale.get(this)
    let sieve = _sieve.get(this)

    return {
      cfSize: cfSize,
      fpSize: fpSize,
      bSize: bSize,
      scale: scale,
      sieve: sieve.map((filter)=> {return filter.toJSON()})
    }
  }

  static fromJSON (obj) {
    return new CuckooSieve(obj)
  }

  toCBOR(){
    return abToB(cbor.encode(this.toJSON()))
  }
  static fromCBOR(buf){
    let obj = cbor.decode(toAb(buf))
    obj.sieve= obj.sieve.map((filter)=> {return Cuckoo.fromJSON(filter)})
    return CuckooSieve.fromJSON(obj)
  }
}
