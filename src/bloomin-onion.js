'use strict'
const fs = require('fs')
const pth = require('path')
let _fibBuckets= new WeakMap()
let _path = new WeakMap()
let sequence = [0, 1]
function fibSequence(num){
  let output = 0
  for (var i = 0; i < num; i++) {
    sequence.push(sequence[0] + sequence[1])
    sequence.splice(0, 1)
    output = sequence[1]
  }
  return output
}

module.exports = class BloominOnion {
  constructor (path) {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid path')
    }
    mkdirp.sync(path)
    _path.set(this, path)
    let items = fs.readdirSync(path)
    let fibBuckets =[]
    if(items.length = 0){
      let f1 = pth.join(path,'.f1')
      mkdirp.sync(path)
      let contents = new Bloom(1, .1789, 2)
      let hitBox = new Sieve()
      fibBuckets.push({limit: 1 , contents: contents, hitBox: hitBox})
      _fibBuckets.set(this, fibBuckets)
    } else {
      let reg = /^\.f(\d+)$/g
      for (let i = 0; i < items.length; i++){
        let item = items[i]
        let results

        if(results= reg.exec(item)){
          fibBuckets[(results[1] -1)] = {limit: fibSequence(results[1]) , contents: contents, hitBox: hitBox}
        }
      }
      _fibBuckets.set(this, fibBuckets)
    }
  }

  get path () {
    return _path.get(this)
  }

  has (key, cb) {
    if (!cb || typeof cb !== 'function') {
      throw new Error('Invalid Callback')
    }
    if (this.blocks) {
      let found = this.blocks.find((block)=> { return key === block})
      return process.nextTick(()=> {cb(!!found)})
    } else {
      this.load((err)=> {
        if (err) {
          return process.nextTick(()=> {cb(err)})
        }
        let found = this.blocks.find((block)=> { return key === block})
        return process.nextTick(()=> {cb(!!found)})
      })
    }
  }
}