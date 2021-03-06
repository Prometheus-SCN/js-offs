const EventEmitter = require('events').EventEmitter
let _map = new WeakMap()
let _timers = new WeakMap()
let _timeout = new WeakMap()
module.exports = class ExpirationMap extends EventEmitter {
  constructor (timeout) {
    super()
    _map.set(this, new Map())
    _timers.set(this, new Map())
    _timeout.set(this, timeout)
  }

  set (key, value, timeout) {
    let map = _map.get(this)
    timeout = timeout || _timeout.get(this) || 0
    let timers = _timers.get(this)
    let timer = timers.get(key)
    if (timer) {
      clearTimeout(timer)
    }
    map.set(key, value)
    timers.set(key, setTimeout(() => {
      this.delete(key)
    }, timeout))
  }

  get (key, timeout) {
    let map = _map.get(this)
    timeout = timeout || _timeout.get(this) || 0
    let timers = _timers.get(this)
    let timer = timers.get(key)
    if (timer) {
      clearTimeout(timer)
    }
    timers.set(key, setTimeout(() => {
      this.delete(key)
    }, timeout))
    return map.get(key)
  }

  has (key) {
    let map = _map.get(this)
    return map.has(key)
  }

  delete (key) {
    let map = _map.get(this)
    let timers = _timers.get(this)
    this.emit(key, map.get(key))
    map.delete(key)
    timers.delete(key)
  }

  clear (key) {
    let map = _map.get(this)
    let timers = _timers.get(this)
    map.clear()
    timers.clear()
  }

  get size () {
    let map = _map.get(this)
    return map.size
  }

  keys () {
    let map = _map.get(this)
    return map.keys()
  }

  values () {
    let map = _map.get(this)
    return map.values()
  }

  [Symbol.iterator] () {
    let map = _map.get(this)
    return map[Symbol.iterator]
  }
}