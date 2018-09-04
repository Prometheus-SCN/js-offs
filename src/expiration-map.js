let _map = new WeakMap()
let _timers = new WeakMap()
let _timeout = new WeakMap()
module.exports = class ExpirationMap {
  constructor (timeout) {
    _map.set(this, new Map())
    _timers.set(this, new Map())
    _timeout.set(this, new Map())
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
      map.delete(key)
      timers.delete(key)
    }, timeout))
  }

  get (key, timeout) {
    let map = _map.get(this)
    timeout = timeout || _timeout.get(this) || 0
    let timeout = _timeout.get(this)
    clearTimeout(timers.get(this))
    timers.set(key, setTimeout(() => {
      map.delete(key)
      timers.delete(key)
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