'use strict'
const Bloom = require('./scalable-bloom-filter')
const config = require('../config')
let _sieve = new WeakMap()
let _failureRate = new WeakMap()
let _scale = new WeakMap()
module.exports= class BloomSieve {
  constructor(failureRate, scale){
    if(isNaN(failureRate)){
      throw new Error ("Invalid Failure Rate")
    }
    _failureRate.set(this, failureRate)
    if(!Number.isInteger(scale)){
      throw new Error ("Invalid Scale")
    }
    _scale.set(this, scale)
    _sieve.set(this, [])
  }
  tally(item){
    let sieve = _sieve.get(this)
    let failureRate = _failureRate.get(this)
    let scale = _scale.get(this)
    let mark= 0
    for(let i = sieve.length-1 ; i >= 0; i--){
      let rank = sieve[i]
      if (rank.contains(item)){
        mark= i+1
        break;
      }
    }
    if (mark > sieve.length-1){
      sieve.push(new Bloom(1, failureRate, scale))
    }
    sieve[mark].add(item)
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
  countAtRank(rank){
    let mark = rank-1
    if(mark > this.max || mark < 0){
      return 0
    }
    let sieve = _sieve.get(this)
    return sieve[mark].count
  }
  rebuildAtRank(rank, rebuilder){
    if(!Number.isInteger(rank) || (rank-1) > this.max || (rank-1) < 0){
      throw new Error('Invalid Rank')
    }
    if(typeof rebuilder !== 'function'){
      throw new Error('Invalid Rebuild Function')
    }
    let mark = rank-1
    let sieve = _sieve.get(this)
    let oldRank= sieve[mark]
    let newRank= new Bloom(1, .1789, 2)
    rebuilder(oldRank, newRank)
    if (!(newRank instanceof Bloom)){
      throw new Error('Invalid Rebuilt Rank')
    }
    console.log(`new rank has ${newRank.count}`)
    sieve[mark]= newRank
  }
}
