'use strict'
const BlockCache = require('./block-cache')
const OffUrl = require('./off-url')
const config = require('./config')
const bs58 = require('bs58')
const collect = require('collect-stream')
let _blockCache = new WeakMap()
let _descriptor = new WeakMap()
let _url = new WeakMap()
let _size = new WeakMap()
let _offsetStart = new WeakMap()
let _blockSize = new WeakMap()
let _blockRouter = new WeakMap()
let _urls = new WeakMap()
module.exports = class Recycler {
  constructor (blockSize, urls, blockCache, blockRouter) {
    if (!Number.isInteger(blockSize)) {
      throw new Error('Block size must be an integer')
    }
    if (!Array.isArray(urls)) {
      throw new TypeError("URL's must be an array of OffUrl's")
    }
    let valid = []
    for (let url of urls) {
      if (!(url instanceof OffUrl)) {
        continue
      }
      if (url.contentType === 'offsystem/directory') {
        valid.push(url)
        continue
      }
      if (validateUrl(url, blockSize)) {
        valid.push(url)
      }
    }
    _urls.set(this, valid)
    _blockSize.set(this, blockSize)
    _blockCache.set(this, blockCache)
    _blockRouter.set(this, blockRouter)
  }
  get empty () {
    let url = _url.get(this)
    let urls = _urls.get(this)
    return !url && !urls.length
  }

  next (cb) {
    let url = _url.get(this)
    if (!url) {
      let urls = _urls.get(this)
      if (urls.length) {
        url = urls.shift()
        if (url.contentType === 'offsystem/directory') {
          let rs
          let br = _blockRouter.get(this)
          try {
            rs = br.createReadStream(url)
          } catch (ex) {
            return cb('error', ex)
          }
          return collect(rs, (err, data) => {
            if (err) {
              return cb('error', err)
            }
            let ofd = JSON.parse(data.toString('utf8'))
            let blockSize =  _blockSize.get(this)
            for (let link of Object.values(ofd)) {
              let url = OffUrl.parse(link)
              if (validateUrl(url, blockSize)) {
                urls.unshift(OffUrl.parse(link))
              }
            }
            _url.get(this, null)
            return this.next(cb)
          })
        }
      } else {
        return cb(new Error('Recycler is Empty'))
      }
    }
    let descriptor = _descriptor.get(url)
    let bc = _blockCache.get(this)

    let getBlock = () => {
      let key = descriptor.shift()
      _descriptor.set(url, descriptor)
      let doNext = () => {
        bc.get(key, cb)
      }
      let testContents = (contains) => {
        if (!contains) {
          let flightBox = bc.load([ key ])
          flightBox.emitter.once(key, doNext)
          flightBox.emitter.once('error', (err) => {
            return cb(err)
          })
        } else {
          doNext()
        }
      }
      bc.contains(key, testContents)
    }

    // If there is a stream offset it means we are looking for a specific section of the data
    // we remove descriptor until the blocks are in the range of the data we want
    let moveToOffset = () => {
      if (url.streamOffset) {
        let offset = Math.floor(url.streamOffset / config.blockSize)
        for (let i = 0; i < (offset * config.tupleSize); i++) {
          size = size + config.blockSize
          descriptor.shift()
        }
        _size.set(this, size)
        let start = url.streamOffset % config.blockSize
        _offsetStart.set(this, start)
      }
    }
    //If possible let's Reproduce the same blocks by moving all the new off blocks in the
    // representation to being last in the descriptor
    let segregateNewBlocks = () => {
      let front = []
      let back = []

      for (let i = 0; i < descriptor.length; i++) {
         if (i % config.tupleSize) {
           front.push(descriptor[i])
         } else {
           back.push(descriptor[i])
         }
      }
      descriptor = [...front, ...back]
      _descriptor.set(this, descriptor)
    }

    if (!descriptor) { // this is the first run
      //create an empty descriptor array
      descriptor = []
      let blockSize = _blockSize.get(this)
      let blocks = Math.ceil(url.streamLength / blockSize) //total number of source blocks
      let cutPoint = ((Math.floor(blockSize / config.descriptorPad) ) * config.descriptorPad)// maximum length of a descriptor in bytes
      let descKeys = blocks * config.tupleSize//total number of keys for all blocks in descriptor
      let keybuf
      let getDesc = (err, block)=> {
        if (err) {
          return cb(err)
        }
        if (block) {
          keybuf = block.data.slice(0, cutPoint)
        }
        if (keybuf.length > 0) {
          if (descriptor.length < descKeys) {
            let key = bs58.encode(keybuf.slice(0, config.descriptorPad))
            descriptor.push(key)
            keybuf = keybuf.slice(config.descriptorPad, keybuf.length)
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
                  return cb(err)
                })
              }
            })
          } else {
            moveToOffset()
            segregateNewBlocks()
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
            return cb(err)
          })
        }
      })
    } else {
      if (descriptor.length === 0 || size === url.streamLength) {
        _url.set(this, null)
        return this.next(cb)
      }
      process.nextTick(getBlock)
    }
  }
}

function validateUrl (url, blockSize) {
  if (!url.streamLength) {
    throw new TypeError('URL must have a stream length')
  }
  if (url.streamLength >= config.blockSize) {
    if (blockSize !== config.blockSize) {
      return false
    }
  } else if (url.streamLength >= config.miniBlockSize) {
    if (blockSize !== config.miniBlockSize) {
      return false
    }
  } else {
    if (blockSize !== config.nanoiBlockSize) {
      return false
    }
  }
  return true
}