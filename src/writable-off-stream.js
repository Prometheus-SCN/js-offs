'use strict'
const blocker = require('block-stream2')
const Writable = require('readable-stream').Writable;
const BlockCache= require('./block-cache')
const Block = require('./block')
const util= require('./util')
const through= require('through2')
const isStream= require('isstream')
const streamifier = require('streamifier')
const _tupleSize= 3
const _blockSize = 128000
let _path= new WeakMap()
let _blockCache= new WeakMap()
let _usedRandoms= new WeakMap()
let _tuples = new WeakMap()
let _hasher = new WeakMap()
let _count = new WeakMap()
module.exports= class WritableOffStream extends Writable {
  constructor(opts){
    if(!opts){
      throw new Error('Invalid Options')
    }
    if(typeof opts === 'string') {
      opts = { path: opts }
    }
    if(opts.path){
      _path.set(this, opts)
    } else {
      throw new Error('Invalid Path')
    }
    opts.highWaterMark = _blockSize
    super(opts)
    _blockCache.set(this, new BlockCache(opts.path))
    _usedRandoms.set(this, [])
    _tuples.set(this, {})
    _count.set(this, 0)
  }
  get path (){
    return _path.get(this)
  }
  _write(buf, enc, next){
    let bufStream
    if(Buffer.isBuffer(buf)){
      bufStream = streamifier.createReadStream(buf)
    }
    if(!isStream.isReadable(bufStream)){
      this.emit('error', new Error('Invalid Input'))
      return
    }
    let bc = _blockCache.get(this)
    let used = _usedRandoms.get(this)
    let count = _count.get(this)
    bufStream.pipe(blocker({size:_blockSize, zeroPadding: false}))
    .pipe(through((buf, enc, next)=>{
      bc.randomBlocks((_tupleSize - 1), used,(err, randoms)=>{
        if (err){
          this.emit('error', err)
          return
        }
        let hasher= _hasher.get(this)
        if (hasher){
          let hash =  util.hash(buf)
          hasher= Buffer.concat([hasher, hash])
          _hasher.set(this, hasher)
        }else{
          hasher= util.hash(buf)
          _hasher.set(this, hasher)
        }
        let offBlock = new Block(buf)
        let tuples= _tuples.get(this)
        let tuple = []
        randoms.forEach((random)=>{
          offBlock = offBlock.parity(random)
          tuple.push(random.key)
        })
        used= used.concat(randoms)
        _usedRandoms.set(this, used)
        tuple.unshift(offBlock.key)
        tuples[count] =  tuple
        _tuples.set(this, tuple)
        bc.put(offBlock,(err)=>{
          if(err) {
            this.emit('error', err)
            return
          }
          return next()
        })

      })
    }))
  }

}