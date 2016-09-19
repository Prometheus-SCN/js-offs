'use strict'

const multihashing = require('multihashing')
const crypto= require('crypto')
const pth = require('path')


let util = {}

util.hash = (data) => multihashing(data, 'sha2-256')

util.hasher= () => {return crypto.createHash('sha256')}

util.sanitize = (key, path)=> {
  if (typeof key === 'string') {
    if (key.indexOf(path) === -1) {
      return pth.join(path, key)
    } else {
      return key
    }
  } else {
    throw new Error("Invalid Key")
  }
}
module.exports= util