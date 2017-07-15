'use strict'
const CuckooFilter = require('cuckoo-filter').ScalableCuckooFilter
const blocker = require('block-stream2')
const Writable = require('readable-stream').Writable;
const BlockCache = require('./block-cache')
const Descriptor = require('./descriptor')
const config = require('./config')
const Block = require('./block')
const util = require('./utility')
const bs58 = require('bs58')
const through = require('through2')
const isStream = require('isstream')
const streamifier = require('streamifier')
const OffUrl = require('./off-url')
const _tupleSize = config.tupleSize
const _blockSize = new WeakMap()
let _path = new WeakMap()
let _blockCache = new WeakMap()
let _hasher = new WeakMap()
let _descriptor = new WeakMap()
let _accumulator = new WeakMap()
let _url = new WeakMap()
let _size = new WeakMap()
let _count = new WeakMap()
let _usageFilter = new WeakMap()
let _items = new WeakMap()

module.exports = class WritableOffStream extends Writable {
  constructor (blockSize, opts) {
    if (!Number.isInteger(blockSize)) {
      throw new Error('Block size must be an integer')
    }
    if (!opts) {
      throw new Error('Invalid Options')
    }
    if (opts instanceof BlockCache) {
      opts = { bc: opts }
    }
    if (!opts.bc) {
      throw new Error('Invalid Block Cache')
    }
    opts.highWaterMark = blockSize
    super(opts)
    if (opts.url && (opts.url instanceof OffUrl)) {
      _url.set(this, opts.url)
    } else {
      opts.url = new OffUrl
      _url.set(this, opts.url)
    }

    if (opts.url.streamLength) {
      let blocks = Math.ceil(opts.url.streamLength / blockSize)
      _usageFilter.set(this, new CuckooFilter(blocks, config.bucketSize, config.fingerprintSize, config.scale))
    } else {
      _usageFilter.set(this, new CuckooFilter(200, config.bucketSize, config.fingerprintSize, config.scale))
    }
    _blockSize.set(this, blockSize)
    _blockCache.set(this, opts.bc)
    _descriptor.set(this, new Descriptor(blockSize, opts.bc, opts.url.streamLength))
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
                return process.nextTick(()=> {next(err)})
              }
              return process.nextTick(()=> {next(err)})
            })
          } else {
            let hasher = _hasher.get(this)
            let url = _url.get(this)
            let size = _size.get(this)
            url.fileHash = bs58.encode(hasher.digest())
            url.descriptorHash = dBlocks[ 0 ].key
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

        //Start Chunking and processing chunks into blocks
        bufStream.pipe(blocker({ size: blockSize, zeroPadding: false }))
          .pipe(through((buf, enc, nxt)=> {
            let bc = _blockCache.get(this)
            let items = _items.get(this)
            let usageFilter = _usageFilter.get(this)

            bc.randomBlocks((_tupleSize - 1), usageFilter, items, (err, items, randoms)=> {
              if (err) {
                this.emit('error', err)
                return
              }
              _items.set(this, items)
              //create off block from
              let count = _count.get(this)
              let offBlock = new Block(buf, blockSize)
              if (count === 0) {
                let url = _url.get(this)
                url.hash = offBlock.key
                _url.set(this, url)
              }
              let descriptor = _descriptor.get(this)
              let tuple = []
              for (let i = 0; i < randoms.length; i++) {
                offBlock = offBlock.parity(randoms[ i ])
                tuple.push(randoms[ i ])
              }
              if (count < _tupleSize) {
                let url = _url.get(this)
                url[ 'tupleBlock' + (count + 1) ] = offBlock.key
                _url.set(this, url)
              }

              count++
              _count.set(this, count)
              tuple.unshift(offBlock)

              for (let i; i < tuple.length; i++) {
                usageFilter.add(tuple[ i ].key)
              }

              descriptor.tuple(tuple)
              _descriptor.set(this, descriptor)

              bc.put(offBlock, (err)=> {
                if (err) {
                  this.emit('error', err)
                  return
                }
                return process.nextTick(()=> {nxt(null, buf)})
              })
              bc.emit('block', offBlock)
            })
          }))//hash original file
          .pipe(through((buf, enc, nxt)=> {
            let hasher = _hasher.get(this)
            hasher.update(buf)
            _hasher.set(this, hasher)
            return process.nextTick(()=> {nxt()})
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
    let blockSize = _blockSize.get(this)
    let accumulator = _accumulator.get(this)
    let size = _size.get(this)
    size += buf.length
    _size.set(this, size)
    accumulator = Buffer.concat([ accumulator, buf ])
    _accumulator.set(this, accumulator)
    if (accumulator.length < blockSize) {
      return next()
    } else {
      buf = accumulator.slice(0, blockSize)
      accumulator = accumulator.slice(blockSize)
      _accumulator.set(this, accumulator)
      let hasher = _hasher.get(this)
      hasher.update(buf)
      _hasher.set(this, hasher)
      let bc = _blockCache.get(this)
      let usageFilter = _usageFilter.get(this)
      let items = _items.get(this)
      bc.randomBlocks((_tupleSize - 1), usageFilter, items, (err, items, randoms)=> {
        if (err) {
          this.emit('error', err)
          return
        }
        _items.set(this, items)
        //create off block from
        let count = _count.get(this)
        let offBlock = new Block(buf, blockSize)
        if (count === 0) {
          let url = _url.get(this)
          url.hash = offBlock.key
          _url.set(this, url)
        }

        let descriptor = _descriptor.get(this)
        let tuple = []
        for (let i = 0; i < randoms.length; i++) {
          offBlock = offBlock.parity(randoms[ i ])
          tuple.push(randoms[ i ])
        }

        if (count < 3) {
          let url = _url.get(this)
          url[ 'tupleBlock' + (count + 1) ] = offBlock.key
          _url.set(this, url)
        }

        count++
        _count.set(this, count)

        tuple.unshift(offBlock)

        for (let i; i < tuple.length; i++) {
          usageFilter.add(tuple[ i ].key)
        }

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
        bc.emit('block', offBlock)
      })
    }
  }

}