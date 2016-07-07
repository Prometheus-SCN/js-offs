'use strict'

const multihashing = require('multihashing')


let util = {}

util.hash = (data) => multihashing(data, 'sha2-256')


module.exports= util