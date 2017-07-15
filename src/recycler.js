'use strict'
const config = require('./config')
let _urls = new WeakMap()
module.export = class Recycler {
  constructor (urls) {
    if (!Array.isArray(urls)) {
      throw new TypeError("URL's  must be an array of OffUrl's")
    }
  }

  next (cb) {

  }
}