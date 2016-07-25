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
const _descriptorPad = 46
const _tupleSize = 3

module.exports = class ReadableOffStream extends Readable {
  constructor (url, opts) {
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
    _detupler.set(this, ()=> {})
  }

  _read () {
    let url = _url.get(this)
    let size = _size.get(this)
    /*if(size === url.streamLength){
      return this.push(null)
    }*/
    let descriptor = _descriptor.get(this)
    let bc = _blockCache.get(this)
    let getBlock = ()=>{
      let tuple =[]
      let key

      let yieldBlock= () => { // does actual calculation of the original block
        let sblock = tuple.pop()
        tuple.forEach((block)=>{
          sblock= sblock.parity(block)
        })
        if((size + sblock.data.length) > url.streamLength)
        {
          let diff = url.streamLength - (size + sblock.data.length)
          size = size + diff

          _size.set(this, size)
          this.push(sblock.data.slice(0, diff))
          this.push(null)
        } else{
          size = size + sblock.data.length

          _size.set(this, size)
          this.push(sblock.data)
        }
      }

      let i= -1
      let next = (err, block)=>{
        if (err) {
          this.emit('error', err)
          return
        }
        i++
        if (block){
          tuple.push(block)
        }
        if( i < _tupleSize){
          key =  descriptor.shift()
          _descriptor.set(this, descriptor)
          bc.get(key, next)
        } else {
          return yieldBlock()
        }
      }
      next()
    }
    if (!descriptor) { // this is the first run
      //create an empty descriptor array
      descriptor = []
      bc.get(url.descriptorHash, (err, block)=> {
        if (err) {
          this.emit('error', err)
          return
        }
        let zeroes = new Buffer(1) //identify where the keys end in the block
        zeroes = zeroes.fill(0)
        let end = block.data.indexOf(zeroes)
        let keybuf = block.data.slice(0, end)
        let keys = keybuf.length / _descriptorPad // determine total number of keys available


        if (keys % _tupleSize === 1) {// if the keys have a remainder there is more than one descriptor block
          //loop through all but last key and add to descriptor set
          for (let i = 0; i < keybuf.length - _descriptorPad; i += _descriptorPad) {
            let block = keybuf.slice(i, (i + _descriptorPad)).toString('utf8')
            descriptor.push(block)
          }
          _descriptor.set(this, descriptor)
          //get the next descriptor block
          let nextDesc = keybuf.slice(keybuf.length - _descriptorPad, keybuf.length).toString('utf8')
          //callback loop function
          let getNext = (err, block)=> {
            if (err) {
              this.emit('error', block)
              return
            }
            let end = block.data.indexOf(zeroes)
            let keybuf = block.data.slice(0, end)
            let keys = keybuf.length / _descriptorPad
            if (keys % _tupleSize !== 0) {
              let nextDesc = keybuf.slice(keybuf.length - _descriptorPad, keybuf.length).toSting('utf8')
              bc.get(nextDesc, getNext)
            } else {
              for (let i = 0; i < keybuf.length; i += _descriptorPad) {
                let block = keybuf.slice(i, (i + _descriptorPad)).toString('utf8')
                descriptor.push(block)
              }
              _descriptor.set(this, descriptor)
              getBlock()
            }

          }

        } else {
          //loop till the end adding to the descriptor set
          for (let i = 0; i < keybuf.length; i += _descriptorPad) {
            let block = keybuf.slice(i, (i + _descriptorPad)).toString('utf8')
            descriptor.push(block)
          }
          _descriptor.set(this, descriptor)
          getBlock()
        }

      })
    } else {
      if(descriptor.length === 0){
        return this.push(null)
      }
      getBlock()
    }
  }
}