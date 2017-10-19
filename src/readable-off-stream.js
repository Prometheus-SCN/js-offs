'use strict'
const Readable = require('readable-stream').Readable;
const BlockCache = require('./block-cache')
const OffUrl = require('./off-url')
const config = require('./config')
const bs58 = require('bs58')
let _blockCache = new WeakMap()
let _descriptor = new WeakMap()
let _url = new WeakMap()
let _size = new WeakMap()
let _offsetStart = new WeakMap()
let _blockSize = new WeakMap()
let _flightBox = new WeakMap()
const _descriptorPad = config.descriptorPad
const _tupleSize = config.tupleSize
module.exports = class ReadableOffStream extends Readable {
  constructor (url, blockSize, opts) {
    if (!(url instanceof OffUrl)) {
      throw new Error('Invalid url')
    }
    if (!Number.isInteger(blockSize)) {
      throw new Error('Block size must be an integer')
    }
    if (!opts) {
      throw new Error('Invalid options')
    }
    if (opts instanceof BlockCache) {
      opts = { bc: opts }
    }

    opts.highWaterMark = blockSize
    super(opts)
    _url.set(this, url)
    _size.set(this, 0)
    _blockCache.set(this, opts.bc)
    _blockSize.set(this, blockSize)
  }

  _read () {
    let url = _url.get(this)
    let size = _size.get(this)
    let descriptor = _descriptor.get(this)
    let bc = _blockCache.get(this)

    let getBlock = () => {
      let tuple = []
      let key
      let flightBox = _flightBox.get(this)

      let yieldBlock = () => { // does actual calculation of the original block
        let sblock = tuple.pop()
        let offsetStart = _offsetStart.get(this)
        tuple.forEach((block)=> {
          sblock = sblock.parity(block)
        })
        if ((size + sblock.data.length) > url.streamOffsetLength) {
          let diff = (url.streamOffsetLength - (size + sblock.data.length)) + sblock.data.length
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
            _offsetStart.set(this, null)
          } else {
            this.push(sblock.data)
          }
        }
      }

      let i = -1
      let next = (err, block) => {
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
          _descriptor.set(this, descriptor)
          let doNext = () => {
            bc.get(key, next)
          }
          bc.contains(key, (contains) => {
            if (!contains) {
              if (flightBox && flightBox.filter.contains(key)) {
                flightBox.emitter.on(key, doNext)
              } else {
                let flightBox = bc.load([ key ])
                flightBox.emitter.once(key, doNext)
                flightBox.emitter.once('error', (err) => {
                  this.emit('error', err)
                })
                _flightBox.set(this, flightBox)
              }
            } else {
              doNext()
            }
          })
        } else {
          return yieldBlock()
        }
      }
      next()
    }

    // If there is a stream offset it means we are looking for a specific section of the data
    // we remove descriptor until the blocks are in the range of the data we want
    let moveToOffset = () => {
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
    }
    if (!descriptor) { // this is the first run
      //create an empty descriptor array
      descriptor = []
      let blockSize = _blockSize.get(this)
      let blocks = Math.ceil(url.streamLength / blockSize) //total number of source blocks
      let cutPoint = ((Math.floor(blockSize / _descriptorPad) ) * _descriptorPad)// maximum length of a descriptor in bytes
      let descKeys = blocks * _tupleSize//total number of keys for all blocks in descriptor
      let keybuf
      let getDesc = (err, block)=> {
        if (err) {
          this.emit('error', err)
          return
        }
        if (block) {
          keybuf = block.data.slice(0, cutPoint)
        }
        if (keybuf.length > 0) {
          if (descriptor.length < descKeys) {
            let key = bs58.encode(keybuf.slice(0, _descriptorPad))
            descriptor.push(key)
            keybuf = keybuf.slice(_descriptorPad, keybuf.length)
            return getDesc()
          } else {
            moveToOffset()
            return getBlock()
          }
        } else {
          if (descriptor.length < descKeys) {
            let nextDesc = descriptor.pop()
            bc.contains(url.descriptorHash, (contains) => {
              if (contains) {
                bc.get(nextDesc, getDesc)
              } else {
                let flightBox = bc.load([ nextDesc ])
                flightBox.emitter.once(nextDesc, () => {
                  bc.get(nextDesc, getDesc)
                })
                flightBox.emitter.once('error', (err) => {
                  this.emit('error', err)
                })
              }
            })
          } else {
            moveToOffset()
            return getBlock()
          }
        }
      }
      bc.contains(url.descriptorHash, (contains) => {
        if (contains) {
          bc.get(url.descriptorHash, getDesc)
        } else {

          let flightBox = bc.load([ url.descriptorHash ])
          flightBox.emitter.once(url.descriptorHash, () => {
            bc.get(url.descriptorHash, getDesc)
          })
          flightBox.emitter.once('error', (err)=> {
            this.emit('error', err)
          })
        }
      })
    } else {
      if (descriptor.length === 0 || size === url.streamLength) {
        return this.push(null)
      }
      process.nextTick(getBlock)
    }
  }
}