'use strict'

const multihashing = require('multihashing')
const crypto= require('crypto')


let util = {}

util.hash = (data) => multihashing(data, 'sha2-256')

util.hasher= () => {return crypto.createHash('sha256')}


module.exports= util