'use strict'
const fs = require('fs')
const FibonacciBucket = require('./fibonacci-bucket')
const mkdirp = require('mkdirp')
let _buckets = new WeakMap()
let _path = new WeakMap()
let  EventEmitter = require('events').EventEmitter
module.exports =  class FibonacciCache extends EventEmitter {
  constructor(path){
    super()
    if (!path || typeof path !== 'string') {
      throw new TypeError('Invalid path')
    }
    _path.set(this, path)
    mkdirp.sync(path)
    let items = fs.readdirSync(path)
    let reg = /.f([\d]+)/g
    let buckets= []
    for(let i = 0 ; i < items.length; i++){
      let results = reg.exec(items[i])
      if (results){
          buckets.push(new FibonacciBucket(path, parseInt(results[1])))
      }
    }
    _buckets.set(this, buckets)
  }
  get path(){
    return _path.get(this).slice(0)
  }
  contains(key){
    let buckets = _buckets.get(this)
    for(let i = buckets.length - 1; i >= 0; i--){
      if(buckets[i].contains(key)){
        return true
      }
    }
    return false
  }
  put(block, cb){
    let buckets = _buckets.get(this)

    let index = buckets.findIndex((bucket)=>{return bucket.contains(block.key)})
    let found = buckets[index]
    if(!found){
      if(buckets.length === 0) {
        buckets.push(new FibonacciBucket(this.path))
      }
      let bucket = buckets[0]
      bucket.put(block, (err)=>{
        if(err){
          process.nextTick(()=>{
            return cb(err)
          })
        }
        if(bucket.tally(block.key)){
          this.promote(block, 0, (err)=>{
            if(err){
              return process.nextTick(()=>{return cb(err)})
            }
            return process.nextTick(cb)
          })
        } else{
          process.nextTick(cb)
        }
      })
    } else{
      if(found.tally(block.key)){
        this.promote(block, index, (err)=>{
          if(err){
            return process.nextTick(()=>{return cb(err)})
          }
          return process.nextTick(cb)
        })
      } else{
        return process.nextTick(cb)
      }
    }
  }
  get(key, cb){
    let buckets = _buckets.get(this)
    let i = buckets.length
    let next = (err, block)=>{
      if(err){

      }
      if(block){
        if(buckets[i].tally(block.key)){
          this.promote(block, index, (err)=>{
            if(err){
              return process.nextTick(()=>{return cb(err, block)})
            }
            return process.nextTick(()=> {
              return cb(null, block)
            })
          })
        } else {
          return process.nextTick(()=> {
            return cb(null, block)
          })
        }
      }
      i--
      if (i <= 0){
        return process.nextTick(()=>{
          cb (new Error('Block not found'))
        })
      } else {
        if(buckets[i].contains(key)){
          return buckets[i].get(key, next)
        }
        else{
          return process.nextTick(next)
        }
      }
    }
    next()
  }
  remove(key, cb){
    let buckets = _buckets.get(this)
    let i = buckets.length
    let next = (err)=>{
      if(err){//TODO: Make a case for false positives
        return process.nextTick(()=>{
          cb (err)
        })
      }
      i--
      if (i <= 0){
        return process.nextTick(()=>{
          cb (new Error('Block not found'))
        })
      } else {
        if(buckets[i].contains(key)){
          return buckets[i].remove(key, cb)
        }
        else{
          return process.nextTick(next)
        }
      }
    }
    next()
  }
  promote(block, index, cb){
    let buckets = _buckets.get(this)
    buckets[index].unTally(block.key)
    if(!buckets[index+1]){
      let path= _path.get(this)
      buckets[index+1] = new FibonacciBucket(path, index+2)
    }
    buckets[index].remove(block.key, (err)=>{
      if(err){
        return process.nextTick(()=>{
          return cb(new Error("Promotion Failed"))
        })
      }
      buckets[index+1].put(block, (err)=>{
        if(err){
          return process.nextTick(()=>{
            return cb(new Error("Promotion Failed"))
          })
        }
        this.emit('promote', block)
        return process.nextTick(cb)
      })
    })
  }
  randomBlocks(number, usageFilter , items, cb){
    if(typeof items ==='function'){
      cb = items
      items= null
    }
    let buckets = _buckets.get(this)

    let i = buckets.length
    let prior = []
    if(items && typeof items === 'object'){
      i = items.bucket + 1
      items= items.items
    }
    let next = (err, items, blocks) => {
      if (err){
        return process.nextTick(()=>{cb(err)})
      }
      if(blocks){
        if((blocks.length + prior.length) >= number){
          blocks = prior.concat(blocks)
          return process.nextTick(()=>{
           return cb(null, {bucket: i , items: items}, blocks)
          })
        }
        else{
          prior= prior.concat(blocks)
           number -= blocks.length
        }
      }
      i--
      if(i >= 0){
        let bucket = buckets[i]
        bucket.randomBlocks(number, usageFilter, items, next)
      }else{
        return process.nextTick(()=>{
          return cb(null, {bucket: i , items: items}, blocks)
        })
      }
    }
    next(null, items, null)
  }
}