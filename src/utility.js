'use strict'

const crypto = require('crypto')
const pth = require('path')

let util = {}

util.hash = (data) => {
  let hash = crypto.createHash('sha256', { digestLength: 34 })
  hash.update(data)
  return hash.digest()
}

util.hasher = () => {return crypto.createHash('sha256', { digestLength: 34 })}

util.sanitize = (key, path)=> {
  if (typeof key === 'string') {
    if (key.indexOf(path) === -1) {
      return pth.join(path, key)
    } else {
      return key
    }
  } else {
    throw new TypeError("Invalid Key")
  }
}
util.getRandomInt = (min, max)=> {
  return Math.floor(Math.random() * (max - min)) + min;
}
module.exports = util