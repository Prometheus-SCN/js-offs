const Readable = require('readable-stream').Readable;
const BlockCache = require('./block-cache')
const OffUrl = require('./off-url')
const config = require('../config')
const bs58 = require('bs58')
let _blockCache = new WeakMap()
let _descriptor = new WeakMap()
let _url = new WeakMap()
let _size = new WeakMap()
let _detupler = new WeakMap()
let _offsetStart = new WeakMap()
let _blockSize = new WeakMap()
const _descriptorPad = config.descriptorPad
const _tupleSize = config.tupleSize

module.exports = class ReadableOffStream extends Readable {
  constructor (url, blockSize, opts) {
    if (!(url instanceof OffUrl)) {
      throw new Error('Invalid url')
    }
    if(!Number.isInteger(blockSize)){
      throw new Error('Block size must be an integer')
    }
    if (!opts) {
      throw new Error('Invalid options')
    }
    if (opts instanceof BlockCache) {
      opts = { bc: opts }
    }

    opts.highWaterMark = _blockSize
    super(opts)
    _url.set(this, url)
    _size.set(this, 0)
    _blockCache.set(this, opts.bc)
    _detupler.set(this, ()=> {})
    _blockSize.set(this, blockSize)
  }

  _read () {
    let url = _url.get(this)
    let size = _size.get(this)
    let descriptor = _descriptor.get(this)
    let bc = _blockCache.get(this)

    let getBlock = ()=> {
      let tuple = []
      let key

      let yieldBlock = () => { // does actual calculation of the original block
        let sblock = tuple.pop()
        let offsetStart = _offsetStart.get(this)
        tuple.forEach((block)=> {
          sblock = sblock.parity(block)
        })

        if ((size + sblock.data.length) > url.streamOffsetLength) {
          let diff = url.streamOffsetLength - (size + sblock.data.length)
          size = size + diff

          _size.set(this, size)
          if (offsetStart) {
            this.push(sblock.data.slice(offsetStart, diff))
            _offsetStart.set(this, null)
          } else {
            this.push(sblock.data.slice(0, diff))
          }
          this.push(null)
        } else {
          size = size + sblock.data.length

          _size.set(this, size)
          if (offsetStart) {
            this.push(sblock.data.slice(offsetStart, sblock.data.length))
            _offsetStart.set(null)
          } else {
            this.push(sblock.data)
          }
        }
      }

      let i = -1
      let next = (err, block)=> {
        if (err) {
          this.emit('error', err)
          return
        }
        i++
        if (block) {
          tuple.push(block)
        }
        if (i < _tupleSize) {
          key = descriptor.shift()
          bc.get(key, next)
        } else {
          return process.nextTick(()=> {yieldBlock()})
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
        let blockSize = _blockSize.get(this)
        let blocks = Math.ceil(url.streamLength / blockSize) //total number of source blocks
        let cutPoint = ((Math.floor(blockSize / _descriptorPad) ) * _descriptorPad)// maximum length of a descriptor in bytes

        let tuppleBytes = blocks * _descriptorPad * _tupleSize // total size of all tupple descriptions

        let descKeySize = ((Math.ceil(tuppleBytes / blockSize)) * _descriptorPad) - _descriptorPad//total number of bytes for descriptor keys minus first desc block

        let ttlDescSize = tuppleBytes + descKeySize

        let keybuf
        let nextDesc

        keybuf = block.data.slice(0, cutPoint)

        if (ttlDescSize <= cutPoint) {
          keybuf = keybuf.slice(0, ttlDescSize)
          ttlDescSize -= ttlDescSize
        } else {
          nextDesc = bs58.encode(keybuf.slice((keybuf.length - _descriptorPad), keybuf.length))
          keybuf = keybuf.slice(0, (keybuf.length - _descriptorPad))

          ttlDescSize -= _descriptorPad
          ttlDescSize -= keybuf.length
        }
        for (let i = 0; i < keybuf.length; i += _descriptorPad) {
          let block = bs58.encode(keybuf.slice(i, (i + _descriptorPad)))
          descriptor.push(block)
        }
        _descriptor.set(this, descriptor)
        if (nextDesc) {
          let getNext = (err, block)=> {
            if (err) {
              this.emit('error', err)
              return
            }
            let keybuf
            let nextDesc
            let descriptor = _descriptor.get(this)

            keybuf = block.data.slice(0, cutPoint)

            if (ttlDescSize < cutPoint) {
              keybuf = keybuf.slice(0, ttlDescSize)
              ttlDescSize -= ttlDescSize
            } else {
              nextDesc = bs58.encode(keybuf.slice((keybuf.length - _descriptorPad), keybuf.length))
              keybuf = keybuf.slice(0, (keybuf.length - _descriptorPad))
              ttlDescSize -= _descriptorPad
              ttlDescSize -= keybuf.length
            }
            for (let i = 0; i < keybuf.length; i += _descriptorPad) {
              let block = bs58.encode(keybuf.slice(i, (i + _descriptorPad)))
              descriptor.push(block)
            }
            _descriptor.set(this, descriptor)

            if (nextDesc) {
              bc.get(nextDesc, getNext)
            } else {
              process.nextTick(getBlock)
            }

          }
          bc.get(nextDesc, getNext)

        } else {
          if (url.streamOffset) {
            let offset = Math.floor(url.streamOffset / config.blockSize)
            for (let i = 0; i < (offset * _tupleSize); i++) {
              size = size + config.blockSize
              descriptor.shift()
            }
            _size.set(this, size)
            let start = url.streamOffset % config.blockSize
            _offsetStart.set(this, start)
          }
          process.nextTick(getBlock)
        }
      })
    } else {
      if (descriptor.length === 0) {
        return this.push(null)
      }
      process.nextTick(getBlock)
    }
  }
}