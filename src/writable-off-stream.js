'use strict'
const blocker = require('block-stream2')
const Writable = require('readable-stream').Writable;
const BlockCache = require('./block-cache')
const Descriptor = require('./descriptor')
const Block = require('./block')
const util = require('./utility')
const through = require('through2')
const isStream = require('isstream')
const streamifier = require('streamifier')
const OffUrl = require('./off-url')
const _tupleSize = 3
const _blockSize = 128000
let _path = new WeakMap()
let _blockCache = new WeakMap()
let _usedRandoms = new WeakMap()
let _hasher = new WeakMap()
let _descriptor = new WeakMap()
let _accumulator = new WeakMap()

module.exports = class WritableOffStream extends Writable {
  constructor (opts) {
    if (!opts) {
      throw new Error('Invalid Options')
    }
    if (typeof opts === 'string') {
      opts = { path: opts }
    }
    opts.highWaterMark = _blockSize
    super(opts)
    if (opts.path) {
      _path.set(this, opts)
    } else {
      throw new Error('Invalid Path')
    }
    _blockCache.set(this, new BlockCache(opts.path))
    _usedRandoms.set(this, [])
    _descriptor.set(this, new Descriptor())
    _accumulator.set(this, new Buffer(0))
    this.on('finish', ()=> {
      let accumulator = _accumulator.get(this)
      let bc = _blockCache.get(this)
      //callback to help close out the stream with a url
      let genURL = ()=> {
        let descriptor = _descriptor.get(this)
        let dBlocks = descriptor.blocks()
        let i = -1
        let next = (err)=> {
          if (err) {
            this.emit('error', err)
            return
          }
          i++
          if (i < dBlocks.length) {
            let block = dBlocks[ i ]
            bc.put(block, (err)=> {
              if (err) {
                return next(err)
              }
              return next(err)
            })
          } else {
            this.emit('url', new OffUrl())
            return
          }
        }
        next()
      }
      if (accumulator.length > 0) {
        let bufStream

        bufStream = streamifier.createReadStream(accumulator)

        if (!isStream.isReadable(bufStream)) {
          this.emit('error', new Error('Invalid Input'))
          return
        }

        let used = _usedRandoms.get(this)
        //Start Chunking and processing chunks into blocks
        bufStream.pipe(blocker({ size: _blockSize, zeroPadding: false }))
          .pipe(through((buf, enc, nxt)=> {

            bc.randomBlocks((_tupleSize - 1), used, (err, randoms)=> {
              if (err) {
                this.emit('error', err)
                return
              }
              //create off block from
              let offBlock = new Block(buf)
              let descriptor = _descriptor.get(this)
              let tuple = []
              randoms.forEach((random)=> {
                offBlock = offBlock.parity(random)
                tuple.push(random)
              })
              used = used.concat(randoms.map((block)=> {return block.key}))
              _usedRandoms.set(this, used)
              tuple.unshift(offBlock)
              descriptor.tuple(tuple)

              bc.put(offBlock, (err)=> {
                if (err) {
                  this.emit('error', err)
                  return
                }
                return nxt(null, buf)
              })

            })
          }))//hash original file
          .pipe(through((buf, enc, nxt)=> {
            let hasher = _hasher.get(this)
            if (hasher) {
              let hash = util.hash(buf)
              hasher = Buffer.concat([ hasher, hash ])
              _hasher.set(this, hasher)
            } else {
              hasher = util.hash(buf)
              _hasher.set(this, hasher)
            }
            return nxt()
          }))
          .on('finish', genURL)
      } else {
        genURL()
      }
    })
  }

  get path () {
    return _path.get(this)
  }

  _write (buf, enc, next) {
    // we need to accumulate when the bufs are tiny
    let accumulator = _accumulator.get(this)
    accumulator = Buffer.concat([ accumulator, buf ])
    _accumulator.set(this, accumulator)
    if (accumulator.length < _blockSize) {
      return next()
    } else {
      buf = accumulator.slice(0, _blockSize)
      accumulator = accumulator.slice(_blockSize)
      _accumulator.set(this, accumulator)
      // stream for the purpose of chunking 128kb blocks
      let bufStream
      if (Buffer.isBuffer(buf)) {
        bufStream = streamifier.createReadStream(buf)
      }
      if (!isStream.isReadable(bufStream)) {
        this.emit('error', new Error('Invalid Input'))
        return
      }
      let bc = _blockCache.get(this)
      let used = _usedRandoms.get(this)
      //Start Chunking and processing chunks into blocks
      bufStream.pipe(blocker({ size: _blockSize, zeroPadding: false }))
        .pipe(through((buf, enc, nxt)=> {

          bc.randomBlocks((_tupleSize - 1), used, (err, randoms)=> {
            if (err) {
              this.emit('error', err)
              return
            }
            //create off block from
            let offBlock = new Block(buf)
            let descriptor = _descriptor.get(this)
            let tuple = []
            randoms.forEach((random)=> {
              offBlock = offBlock.parity(random)
              tuple.push(random)
            })
            //store the randoms used this round for exclusion
            used = used.concat(randoms.map((block)=> {return block.key}))
            _usedRandoms.set(this, used)
            tuple.unshift(offBlock)
            descriptor.tuple(tuple)
            //save resultant off block
            bc.put(offBlock, (err)=> {
              if (err) {
                this.emit('error', err)
                return
              }
              return nxt(null, buf)
            })

          })
        }))//hash original file
        .pipe(through((buf, enc, nxt)=> {
          let hasher = _hasher.get(this)
          if (hasher) {
            let hash = util.hash(buf)
            hasher = Buffer.concat([ hasher, hash ])
            _hasher.set(this, hasher)
          } else {
            hasher = util.hash(buf)
            _hasher.set(this, hasher)
          }
          return nxt()
        }))
        .on('finish', ()=> {
          next()
        })
    }
  }

}