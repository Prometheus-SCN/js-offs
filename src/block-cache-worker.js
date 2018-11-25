const { Worker, isMainThread, parentPort, workerData, threadId } = require('worker_threads')
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const bs58 = require('bs58')
const fs = require('fs')
const hamming = require('hamming-distance')

if (isMainThread) {
  let _pool = new Map()
  let _callbacks = new WeakMap()
  let _queue = new WeakMap()
  module.exports = class Pool {
    constructor(size, path, bucketSize, fingerprintSize) {
      _queue.set(this, [])
      for (let i = 0; i < size; i++) {
        let worker = new Worker(__filename, {
          workerData: {path, bucketSize, fingerprintSize}
        })
        _pool.set(worker.threadId, worker)
        worker.on('message', (msg) => {
          let cb
          switch (msg.type) {
            case 'content':
              cb = _callbacks.get(worker)
              _callbacks.set(worker, undefined)
              if (msg.err) {
                return cb(msg.err)
              }
              this._free(worker.threadId)
              return cb(null, msg.content)
              break
            case 'contentFilter':
              cb = _callbacks.get(worker)
              _callbacks.set(worker, undefined)
              if (msg.err) {
                return cb(msg.err)
              }
              this._free(worker.threadId)
              console.log('callback sent')
              return cb(null, msg.filter)
              break
            case 'closestBlock':
              cb = _callbacks.get(worker)
              _callbacks.set(worker, undefined)
              if (msg.err) {
                return cb(msg.err)
              }
              this._free(worker.threadId)
              return cb(null, msg.key)
              break
          }
        })
      }
    }
    _freeWorker() {
      for (let [_, worker] of _pool) {
        if (!_callbacks.get(worker)) {
          return worker
        }
      }
    }
    content (temps, cb) {
      let worker = this._freeWorker()
      if (worker) {
        _callbacks.set(worker, cb)
        worker.postMessage({type: 'content', temps})
      } else {
        let queue = _queue.get(this)
        queue.unshift({type: 'content', temps, cb: cb})
      }
    }

    contentFilter (temps, cb){
      let worker = this._freeWorker()
      if (worker) {
        _callbacks.set(worker, cb)
        worker.postMessage({type: 'contentFilter', temps})
      } else {
        let queue = _queue.get(this)
        queue.unshift({type: 'content', temps, cb: cb})
      }
    }

    closestBlock (temps, filter, cb) {
      let worker = this._freeWorker()
      if (worker) {
        _callbacks.set(worker, cb)
        worker.postMessage({type: 'content', temps, filter})
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
          let worker = _pool.get(threadId)
          switch (next.type) {
            case 'content':
              _callbacks.set(worker, next.cb)
              worker.postMessage({type: next.type, temps: next.temps})
              break
            case 'contentFilter':
              _callbacks.set(worker, next.cb)
              worker.postMessage({type: next.type, temps: next.temps})
              break
            case 'closestBlock':
              _callbacks.set(worker, next.cb)
              worker.postMessage({type: next.type, temps: next.temps, filter: next.filter})
              break
          }
        }
      })
    }
  }
} else {
  parentPort.on('message', (msg) => {
    console.log('received message', msg)
    switch(msg.type) {
      case 'content' :
        content(msg.temps, (err, content) => {
          if (err) {
            return parentPort.postMessage({err: err})
          }
          return parentPort.postMessage({ type: msg.type, content})
        })
        break
      case 'contentFilter' :
        contentFilter(msg.temps, (err, filter) => {
          if (err) {
            return parentPort.postMessage({err: err})
          }
          return parentPort.postMessage({ type: msg.type, filter})
        })
        break
      case 'closestBlock' :
        closestBlock (msg.temps, msg.filter, (err, key) => {
          if (err) {
            return parentPort.postMessage({err: err})
          }
          return parentPort.postMessage({ type: msg.type, key})
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
      contentFilter = new CuckooFilter(content.length, workerData.bucketSize, workerData.fingerprintSize)
      for (let key of content){
        contentFilter.add(key)
      }
      return cb(err, contentFilter.toCBOR())
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