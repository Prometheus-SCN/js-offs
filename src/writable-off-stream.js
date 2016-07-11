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
let _usedRandoms = new WeakMap()
let _hasher = new WeakMap()
let _descriptor = new WeakMap()
let _accumulator = new WeakMap()
let _url = new WeakMap()
let _size = new WeakMap()
let _count = new WeakMap()

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
    if (opts.url && (opts.url instanceof OffUrl)){
      _url.set(this, opts.url)
    } else {
      opts.url= new OffUrl
      _url.set(this, opts.url)
    }

    if (opts.path) {
      _path.set(this, opts)
    } else {
      throw new Error('Invalid Path')
    }
    _blockCache.set(this, new BlockCache(opts.path))
    _usedRandoms.set(this, [])
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
                return next(err)
              }
              return next(err)
            })
          } else {
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
              if(count < 3){
                let url = _url.get(this)
                url['tupleBlock' + (count+1)] = offBlock.key
                _url.set(this, url)
              }
              count++
              _count.set(this, count)
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
            hasher.update(buf)
            _hasher.set(this, hasher)
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
            if(count < 3){
              let url = _url.get(this)
              url['tupleBlock' + (count+1)] = offBlock.key
              _url.set(this, url)
            }
            count++
            _count.set(this,count)

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
          hasher.update(buf)
          _hasher.set(this, hasher)
          return nxt()
        }))
        .on('finish', ()=> {
          next()
        })
    }
  }

}