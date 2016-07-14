const Readable = require('readable-stream').Readable;
const BlockCache = require('./block-cache')
const OffUrl = require('./off-url')

let _path = new WeakMap()
let _blockCache = new WeakMap()
let _usedRandoms = new WeakMap()
let _hasher = new WeakMap()
let _descriptor = new WeakMap()
let _url = new WeakMap()
let _size = new WeakMap()
let _count = new WeakMap()
let _detupler = new WeakMap()
const _blockSize = 128000

module.exports = class ReadableOffStream extends Readable{
  constructor(url, opts){
    if (!(url instanceof OffUrl)) {
      throw new Error('Invalid url')
    }
    if (!opts) {
      throw new Error('Invalid options')
    }
    if (typeof opts === 'string') {
      opts = { path: opts }
    }

    opts.highWaterMark = _blockSize
    super(opts)
    _url.set(this, url)
    _size.set(this, 0)
    _blockCache.set(this, new BlockCache(opts.path))
    _detupler.set(this, ()=>{})
  }
  _read(){
    let url= _url.get(this)
    let size = _size.get(this)
    let descriptor = _descriptor.get(this)
    let bc = _blockCache.get(this)
    if(!descriptor){
      bc.get(url.descriptorHash, (err, block)=>{
        block.data.toString().replace('0')


      })
    }
  }
}