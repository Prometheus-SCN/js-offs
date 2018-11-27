const cluster = require('cluster')
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const bs58 = require('bs58')
const fs = require('fs')
const hamming = require('hamming-distance')
if (cluster.isMaster) {
  let _pool = new WeakMap()
  let _callbacks = new WeakMap()
  let _queue = new WeakMap()
  module.exports = class Pool {
    constructor(size, path, bucketSize, fingerprintSize) {
      cluster.setupMaster({
        exec: __filename,
        args: [path, bucketSize, fingerprintSize]
      })
      _pool.set(this, new Map())
      _queue.set(this, [])
      let spawnWorker = () => {
        let worker = cluster.fork()
        let pool = _pool.get(this)
        pool.set(worker.id, worker)
        worker.once('exit', () => {
          pool.delete(worker.id)
          return spawnWorker()
        })
        worker.on('message', (msg) => {
          let cb
          switch (msg.type) {
            case 'content':
              cb = _callbacks.get(worker)
              _callbacks.set(worker, undefined)
              if (msg.err) {
                return cb(msg.err)
              }
              this._free(worker.id)
              return cb(null, msg.content)
              break
            case 'contentFilter':
              cb = _callbacks.get(worker)
              _callbacks.set(worker, undefined)
              if (msg.err) {
                return cb(msg.err)
              }
              this._free(worker.id)
              return cb(null, msg.contentFilter)
              break
            case 'closestBlock':
              cb = _callbacks.get(worker)
              _callbacks.set(worker, undefined)
              if (msg.err) {
                return cb(msg.err)
              }
              this._free(worker.id)
              return cb(null, msg.key)
              break
          }
        })
      }
      for (let i = 0; i < size; i++) {
        spawnWorker()
      }
    }
    _freeWorker() {
      let pool = _pool.get(this)
      for (let worker of pool.values()) {
        if (!_callbacks.get(worker)) {
          return worker
        }
      }
    }
    content (temps, cb) {
      let worker = this._freeWorker()
      if (worker) {
        _callbacks.set(worker, cb)
        worker.send({type: 'content', temps})
      } else {
        let queue = _queue.get(this)
        queue.unshift({type: 'content', temps, cb: cb})
      }
    }

    contentFilter (temps, cb){
      let worker = this._freeWorker()
      if (worker) {
        _callbacks.set(worker, cb)
        worker.send({type: 'contentFilter', temps})
      } else {
        let queue = _queue.get(this)
        queue.unshift({type: 'contentFilter', temps, cb: cb})
      }
    }

    closestBlock (temps, filter, cb) {
      let worker = this._freeWorker()
      if (worker) {
        _callbacks.set(worker, cb)
        worker.send({type: 'content', temps, filter})
      } else {
        let queue = _queue.get(this)
        queue.unshift({type: 'content', temps, filter, cb: cb})
      }
    }
    _free(threadId) {
      process.nextTick(() => {
        let queue = _queue.get(this)
        let next = queue.pop()
        if (next) {
          let pool = _pool.get(this)
          let worker = pool.get(threadId)
          switch (next.type) {
            case 'content':
              _callbacks.set(worker, next.cb)
              worker.send({type: next.type, temps: next.temps})
              break
            case 'contentFilter':
              _callbacks.set(worker, next.cb)
              worker.send({type: next.type, temps: next.temps})
              break
            case 'closestBlock':
              _callbacks.set(worker, next.cb)
              worker.send({type: next.type, temps: next.temps, filter: next.filter})
              break
          }
        }
      })
    }
  }
} else {
  var workerData = { path: process.argv[2], bucketSize: +process.argv[3], fingerprintSize: +process.argv[4]}
  process.on('message', (msg) => {
    switch(msg.type) {
      case 'content' :
        content(msg.temps, (err, content) => {
          if (err) {
            return process.send({err: err})
          }
          return process.send({type: msg.type, content})
        })
        break
      case 'contentFilter' :
        contentFilter(msg.temps, (err, filter) => {
          if (err) {
            return process.send({err: err})
          }
          return process.send({type: msg.type, filter})
        })
        break
      case 'closestBlock' :
        closestBlock (msg.temps, msg.filter, (err, key) => {
          if (err) {
            return process.send({err: err})
          }
          return process.send({type: msg.type, key})
        })
        break
    }
  })
  function content (temps, cb) {
    fs.readdir(workerData.path, (err, items) => {
      if (err) {
        return cb(err)
      }
      try {
        items = items.filter((item) => !(temps.includes(item)))
        return cb(null, items)
      }catch (err) {
        return cb(err)
      }
    })
  }
  function contentFilter (temps, cb) {
    content(temps, (err, content) => {
      if (err) {
        return cb(err)
      }
      let filter = new CuckooFilter(content.length, workerData.bucketSize, workerData.fingerprintSize)
      let i= -1
      for (let i = 0; i < content.length; i++) {
        contentFilter.add(content[i])
      }
      return cb(err, filter.toCBOR())
    })
  }
  function closestBlock (temps, filter, cb) {
    content((err, content) => {
      if (err) {
        return cb(err)
      }
      try {
        filter = Cuckoo.fromCBOR(filter)
        let hash = bs58.decode(key)
        content = content.filter((key) => !filter.contains(key))
        if (!content.length) {
          return cb(new Error('Cache has no new blocks'))
        }
        let sort = (a, b) => {
          let hashA = bs58.decode(a)
          let hashB = bs58.decode(b)
          return hamming(hashA, hash) - hamming(hashB, hash)
        }
        content.sort(sort)
        return cb(null, content[0])
      } catch(err){
        return cb(err)
      }
    })
  }

}