'use strict'
let _buckets = new WeakMap()
let _path = new WeakMap()
module.exports =  class FibonacciCache{
  constructor(path){
    if (!path || typeof path !== 'string') {
      throw new TypeError('Invalid path')
    }
    _path.set(this, path)
    _buckets.set(this, [])
  }
  get path(){
    return _path.get(this).slice(0)
  }
  contains(key){
    let buckets = _buckets.get(this)
    for(let i = buckets.length -1; i >= 0; i--){
      if(buckets[i].contains(key)){
        return true
      }
    }
    return false
  }
  put(block, cb){
    let buckets = _buckets.get(this)
    let found = buckets.find((bucket)=>{return bucket.contains(key)})
    if(!found){
      let bucket = buckets[0]
      bucket.put(block, (err)=>{
        if(err){
          process.nextTick(()=>{
            return cb(err)
          })
        }
        let promote = bucket.tally(block)
        if(promote){

        }
        process.nextTick(cb)
      })
    } else{
      let promote = found.tally(block)
      if(promote){

      }
      process.nextTick(cb)
    }
  }
  get(key, cb){
    let found = buckets.find((bucket)=>{return bucket.contains(key)})
    if(!found){
      buckets[0].put(block, cb)
    } else{
      found.get(key,cb)
    }
  }
  remove(key, cb){
    let buckets = _buckets.get(this)
    let found = buckets.find((bucket)=>{return bucket.contains(key)})
    if(!found){
      buckets[0].put(block, cb)
    } else{
      process.nextTick(cb)
    }
    
  }
  
}