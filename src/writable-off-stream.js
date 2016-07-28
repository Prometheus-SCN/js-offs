'use strict'
const blocker = require('block-stream2')
const Writable = require('readable-stream').Writable;
const BlockCache = require('./block-cache')
const Descriptor = require('./descriptor')
const Block = require('./block')
const util = require('./utility')
const bs58 = require('bs58')
const through = require('through2')
const isStream = require('isstream')
const streamifier = require('streamifier')
const OffUrl = require('./off-url')
const _tupleSize = 3
const _blockSize = 128000
let _path = new WeakMap()
let _blockCache = new WeakMap()
let _hasher = new WeakMap()
let _descriptor = new WeakMap()
let _accumulator = new WeakMap()
let _url = new WeakMap()
let _size = new WeakMap()
let _count = new WeakMap()
let _usageSession= new WeakMap()


module.exports = class WritableOffStream extends Writable {
  constructor (opts) {
    if (!opts) {
      throw new Error('Invalid Options')
    }
    if (opts instanceof BlockCache) {
      opts = { bc: opts }
    }
    if (!opts.bc) {
      throw new Error('Invalid Block Cache')
    }
    opts.highWaterMark = _blockSize
    super(opts)
    if (opts.url && (opts.url instanceof OffUrl)){
      _url.set(this, opts.url)
    } else {
      opts.url= new OffUrl
      _url.set(this, opts.url)
    }

    _blockCache.set(this, opts.bc)
    _descriptor.set(this, new Descriptor())
    _accumulator.set(this, new Buffer(0))
    _hasher.set(this, util.hasher())
    _size.set(this, 0)
    _count.set(this, 0)
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
                return process.nextTick(()=>{next(err)})
              }
              return process.nextTick(()=>{next(err)})
            })
          } else {
            let usageSession = _usageSession.get(this)
            bc.endSession(usageSession)
            let hasher = _hasher.get(this)
            let url = _url.get(this)
            let size = _size.get(this)
            url.fileHash = bs58.encode(hasher.digest())
            url.descriptorHash = dBlocks[0].key
            url.streamLength = size
            url.streamOffsetLength = size
            url.streamOffset = 0
            _url.set(this, url)
            this.emit('url', url)
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
        let bc = _blockCache.get(this)
        let usageSession = _usageSession.get(this)

        //Start Chunking and processing chunks into blocks
        bufStream.pipe(blocker({ size: _blockSize, zeroPadding: false }))
          .pipe(through((buf, enc, nxt)=> {
            let bc = _blockCache.get(this)
            bc.randomBlocks((_tupleSize - 1), usageSession, (err, usageSession, randoms)=> {
              if (err) {
                this.emit('error', err)
                return
              }
              _usageSession.set(usageSession)
               //create off block from
              let count = _count.get(this)
              let offBlock = new Block(buf)
              if(count === 0){
                let url = _url.get(this)
                url.hash = offBlock.key
                _url.set(this, url)
              }
              let descriptor = _descriptor.get(this)
              let tuple = []
              randoms.forEach((random)=> {
                offBlock = offBlock.parity(random)
                tuple.push(random)
              })
              if(count < _tupleSize){
                let url = _url.get(this)
                url['tupleBlock' + (count+1)] = offBlock.key
                _url.set(this, url)
              }
              count++
              _count.set(this, count)
              tuple.unshift(offBlock)
              descriptor.tuple(tuple)
              _descriptor.set(this, descriptor)

              bc.put(offBlock, (err)=> {
                if (err) {
                  this.emit('error', err)
                  return
                }
                return process.nextTick(()=>{nxt(null, buf)})
              })

            })
          }))//hash original file
          .pipe(through((buf, enc, nxt)=> {
            let hasher = _hasher.get(this)
            hasher.update(buf)
            _hasher.set(this, hasher)
            return process.nextTick(()=>{nxt()})
          }))
          .on('finish', genURL)
      } else {
        process.nextTick(genURL)
      }
    })
  }

  get path () {
    return _path.get(this)
  }

  _write (buf, enc, next) {
    // we need to accumulate when the bufs are tiny
    let accumulator = _accumulator.get(this)
    let size= _size.get(this)
    size += buf.length
    _size.set(this, size)
    accumulator = Buffer.concat([ accumulator, buf ])
    _accumulator.set(this, accumulator)
    if (accumulator.length < _blockSize) {
      return next()
    } else {
      buf = accumulator.slice(0, _blockSize)
      accumulator = accumulator.slice(_blockSize)
      _accumulator.set(this, accumulator)
      let hasher = _hasher.get(this)
      hasher.update(buf)
      _hasher.set(this, hasher)
      let bc = _blockCache.get(this)
      let usageSession = _usageSession.get(this)
      bc.randomBlocks((_tupleSize - 1), usageSession, (err, usageSession, randoms)=> {
        if (err) {
          this.emit('error', err)
          return
        }
        _usageSession.set(usageSession)
        //create off block from
        let count = _count.get(this)
        let offBlock = new Block(buf)
        if (count === 0) {
          let url = _url.get(this)
          url.hash = offBlock.key
          _url.set(this, url)
        }

        let descriptor = _descriptor.get(this)
        let tuple = []
        randoms.forEach((random)=> {
          offBlock = offBlock.parity(random)
          tuple.push(random)
        })
        if (count < 3) {
          let url = _url.get(this)
          url[ 'tupleBlock' + (count + 1) ] = offBlock.key
          _url.set(this, url)
        }
        count++
        _count.set(this, count)

        tuple.unshift(offBlock)
        descriptor.tuple(tuple)
        _descriptor.set(this, descriptor)

        //save resultant off block
        bc.put(offBlock, (err)=> {
          if (err) {
            this.emit('error', err)
            return
          }
          return process.nextTick(next)
        })
      })
    }
  }

}