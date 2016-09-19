'use strict'
const Bloom = require('bloomfilter').BloomFilter
let _filterSeries = new WeakMap()
let _scale = new WeakMap()
let _size = new WeakMap()
let _bloom = new WeakMap()
let _failureRate = new WeakMap()
let _count = new WeakMap()
const maxInt = 2147483647
class BloomFilter{
  constructor(size, failureRate) {
    if(!Number.isInteger(size)){
      throw new Error("Invalid Size Count")
    }
    if(isNaN(failureRate) || ( failureRate < 0) || (failureRate > 1)){
      throw new Error("Invalid Failure Rate")
    }
    let max = maxSize(failureRate)
    if (size > max){
      size= max
    }
    _count.set(this, 0)
    _size.set(this, size)
    let bits = bloomBits(size, failureRate)
    let hashes  = bloomFunctions(size, bits)
    if (bits > maxInt){
      bits = maxInt
    }
    _bloom.set(this, new Bloom(bits, hashes))
  }
  get size(){
    return _size.get(this)
  }
  get count(){
    return _count.get(this)
  }
  get reliable(){
    return this.count < Math.floor(this.size/2)
  }
  add(item){
    let bloom = _bloom.get(this)
    let count = _count.get(this)
    count++
    _count.set(this, count)
    bloom.add(item)
    _bloom.set(this, bloom)
  }
  contains(item){
    let bloom = _bloom.get(this)
    return bloom.test(item)
  }
}


module.exports = class ScalableBloomFilter {
  constructor (size, failureRate, scale) {
    let filterSeries = []
    let bloom = new BloomFilter(size, failureRate)
    filterSeries.push(bloom)
    _filterSeries.set(this, filterSeries)
    _size.set(this, size)
    _scale.set(this, scale)
    _failureRate.set(this, failureRate)
  }
  add(item){
    if(!this.contains(item)) {
      let filterSeries = _filterSeries.get(this)
      let current = filterSeries.find((bloom)=> {
        return bloom.reliable
      })
      if (!current) {
        let size = _size.get(this)
        let scale = _scale.get(this)
        let curSize = size * Math.pow(scale, filterSeries.length)
        let failureRate = _failureRate.get(this)
        current = new BloomFilter(curSize, failureRate)
        filterSeries.push(current)
      }
      current.add(item)
    }
  }
  contains(item){
    let filterSeries = _filterSeries.get(this)
    let found = false
    for (let i = 0; i < filterSeries.length; i++){
      found = filterSeries[i].contains(item)
      if(found){
        break;
      }
    }
    return found
  }
  get count(){
    let filterSeries = _filterSeries.get(this)
    let sum = 0
    for (let i = 0; i < filterSeries.length; i++){
      sum += filterSeries[i].count
    }
    return sum
  }
}

function bloomBits(n, p){
  return Math.ceil((n * Math.log(p)) / Math.log(1.0 / (Math.pow(2.0, Math.log(2.0)))))
}

function bloomFunctions(n, m){
  return Math.round(Math.log(2.0) * m / n)
}
function maxSize(p){
  return Math.floor((maxInt * Math.log(1.0 / (Math.pow(2.0, Math.log(2.0))))) / Math.log(p))
}