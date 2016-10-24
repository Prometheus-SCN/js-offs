'use strict'
const Block = require('./block.js')
const BlockCache = require('./block-cache')
const util = require('./utility')
const fs = require('fs')
const ows = require('./writable-off-stream')
const ors = require('./readable-off-stream')
const through = require('through2')
const OffUrl = require('./off-url')
const importer = require('./importer')
const mime = require('mime')
const collect = require('collect-stream')
//const Bloom = require('./scalable-bloom-filter')
const bs58 = require('bs58')
const crypto = require('crypto')
//const BloomSieve = require('./bloom-sieve')
const CuckooSieve = require('./cuckoo-sieve')
const Bucket = require('./fibonacci-bucket')
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const Cache = require('./fibonacci-cache')
const config = require('../config')
const BlockRouter = require('./block-router')
/*
 fs.readFile('test.pdf', (err, data)=> {
 if (err) {
 throw err
 }

 let url = new OffUrl()
 let br = new BlockRouter
 let rs = fs.createReadStream('test.pdf')
 url.fileName = 'test.pdf'
 url.contentType = mime.lookup('test.pdf')
 url.streamLength = data.length
 let ws = br.createWriteStream(url)
 ws.on('url', (url)=> {
 console.log(url.toString())

 let rs = br.createReadStream(url)
 collect(rs, (err, data)=> {
 if (err) {
 throw err
 }
 console.log(data.toString('hex'))
 })
 })
 rs.pipe(ws)

 })*/
/*
 let cache =  new Cache('../.block-cache')
 let blocks = []
 let cuckoo= new CuckooFilter(1000,3,6)
 for (let i = 0; i < 20; i++) {
 let block = Block.randomBlock()
 blocks.push(block)
 }
 cache.on('promote', (block)=>{
 console.log(`promoted ${block.key}`)
 })
 let i = -1
 let deleteStuff = (err)=>{
 if(err){
 throw err
 }
 if( i != -1) {
 console.log(`removed block ${blocks[ i ].key}`)
 }
 i++
 if (i < blocks.length){
 cache.remove(blocks[i].key, deleteStuff)
 }else{
 i= -1
 cache.save((err)=>{
 if(err){
 throw err
 }
 console.log('saved')
 })
 return
 }
 }
 let getStuff = (err, block)=>{
 if(err){
 throw err
 }
 if(block){
 console.log(`got block ${block.key}`)
 }
 i++
 if (i < blocks.length){
 cache.get(blocks[i].key, getStuff)
 }else{
 i= -1
 return deleteStuff()
 }
 }

 let thenAgain = (err)=>{
 if(err){
 throw err
 }
 i++
 if (i < blocks.length){
 cache.put(blocks[i], thenAgain)
 }else{
 i= -1
 return getStuff()
 }
 }

 let then = (err)=>{
 if(err){
 throw err
 }
 i++
 if (i < blocks.length){
 cache.put(blocks[i], then)
 }else{
 i= -1
 return thenAgain()
 }
 }
 let next = (err)=>{
 if(err){
 throw err
 }
 i++
 if (i < blocks.length){
 cache.put(blocks[i], next)
 }else{
 i= -1
 return then()
 }
 }
 let getRandomBlocks= (err, items, blocks)=>{
 if(err){
 console.log(err)
 }

 }
 cache.randomBlocks(3, cuckoo, getRandomBlocks)
 next()
 */

/*
 let fibBucket = new Bucket('../.block-cache')
 let blocks = []
 for (let i = 0; i < 20; i++) {
 let block = Block.randomBlock()
 blocks.push(block)
 }
 let i = -1
 let then = ()=>{
 let cuckoo= new CuckooFilter(1000,3,6)
 fibBucket.randomBlocks(2, cuckoo, (err, items, blocks)=>{
 if(err){
 throw err
 }
 console.log(items)
 console.log(blocks)
 })
 }
 let next = (err)=>{
 if(err){
 throw err
 }
 i++
 if (i < blocks.length){
 fibBucket.tally(blocks[i].key)
 fibBucket.put(blocks[i], next)
 }else{
 i= -1
 return then()
 }
 }

 next(null, then)
 */

/*
 let keys = []
 for (let i = 0; i < 20; i++) {
 let key = bs58.encode(util.hash(crypto.randomBytes(34)))
 keys.push(key)
 }
 let sieve = new CuckooSieve(10, 3, 6, 2 )
 for (let i = 0; i < 20000; i++) {
 let index= util.getRandomInt(0, keys.length-1)
 sieve.tally(keys[index])
 }
 */
/*
 for (let i = 0; i < sieve.max; i++) {
 console.log(`Rank ${(i+1)}:  ${sieve.countAtRank((i+1))}`)
 }*/
/*
 console.log(`Key ${keys[2]} is ranked ${sieve.rank(keys[2])} `)
 let found
 let rank = getRandomInt (1, sieve.max)
 console.log(`Removing from ${rank} with ${sieve.countAtRank(rank)} hits`)

 if(found){
 console.log(`Key ${found} is ranked ${sieve.rank(found)} `)
 }
 console.log(`Rank ${rank} now has ${sieve.countAtRank(rank)} hits`)
 */

fs.readFile('test.pdf', (err, data)=> {
  if (err) {
    throw err
  }
  let slice = data.slice(288, 1000)
  console.log(slice)
  let url = new OffUrl()
  let bc = new BlockCache('../.block-cache', config.blockSize)
  let rs = fs.createReadStream('test.pdf')
  url.fileName = 'test.pdf'
  url.contentType = mime.lookup('test.pdf')
  let ws = new ows(config.blockSize, { bc: bc, url: url })
  ws.on('url', (url)=> {
    console.log(url.toString())
    url.streamOffset = 288
    url.streamOffsetLength = 1000
    let rs = new ors(url, config.blockSize, bc)
    collect(rs, (err, data)=> {
      if (err) {
        throw err
      }
      console.log(data)
      console.log(slice.equals(data))
    })
  })
  rs.pipe(ws)

})
/*
 let sequence = [0, 1]
 function fibSequence(num){
 let output = 0
 for (var i = 0; i < num; i++) {
 sequence.push(sequence[0] + sequence[1])
 sequence.splice(0, 1)
 output = sequence[1]
 }
 return output
 }
 console.log(fibSequence(1))
 */
/*
 function getRandomInt (min, max) {
 return Math.floor(Math.random() * (max - min)) + min;
 }

 let keys = []
 for (let i = 0; i < 20; i++) {
 let key = bs58.encode(util.hash(crypto.randomBytes(34)))
 keys.push(key)
 }
 let sieve = new BloomSieve()
 for (let i = 0; i < 20000; i++) {
 let index= getRandomInt(0, keys.length-1)
 sieve.tally(keys[index])
 }
 for (let i = 0; i < sieve.max; i++) {
 console.log(`Rank ${(i+1)}:  ${sieve.countAtRank((i+1))}`)
 }
 console.log(`Key ${keys[2]} is ranked ${sieve.rank(keys[2])} `)
 let found
 let rank = getRandomInt (1, sieve.max)
 console.log(`Removing from ${rank} with ${sieve.countAtRank(rank)} hits`)
 sieve.rebuildAtRank(rank, (oldRank, newRank)=>{
 console.log(`count in oldrank:${oldRank.count}`)
 console.log(`new rank has ${newRank.count}`)
 let outrank = keys.filter((key)=>{
 return !oldRank.contains(key)
 })
 console.log(`outrank ${outrank.length}`)
 let inrank = keys.filter((key)=>{
 return !outrank.find((ky)=>{return key === ky})
 })
 console.log(`inrank ${inrank.length}`)
 if(inrank.length > 0){
 found = inrank.pop()
 console.log(`inrank ${inrank.length}`)
 inrank.forEach((key)=>{
 newRank.add(key)
 })
 }
 console.log(`new rank has ${newRank.count}`)
 })
 if(found){
 console.log(`Key ${found} is ranked ${sieve.rank(found)} `)
 }
 console.log(`Rank ${rank} now has ${sieve.countAtRank(rank)} hits`)
 */
/*
 function maxSize(p){
 return (2147483647 * Math.log(1.0 / (Math.pow(2.0, Math.log(2.0))))) / Math.log(p)
 }
 console.log(maxSize(.1789))

 /*

 let bloom = new Bloom(1, .1789, 2)
 let keys = []

 for (let i = 0; i < 32000; i++) {
 let key = bs58.encode(util.hash(crypto.randomBytes(34)))
 keys.push(key)
 bloom.add(key)
 }

 keys.forEach((key)=>{
 console.log(`Key: ${key}, Contains: ${bloom.contains(key)}`)
 })

 console.log(bloom.count)
 let key = bs58.encode(util.hash(crypto.randomBytes(256)))
 console.log(bloom.contains(key))

 */


/*
 let bc = new BlockCache('../.block-cache')

 let block = new Block( new Buffer("stuff"))
 let jr = new Buffer('QmfD55TFuTUULNd43zsmb3S5kFs9qgniTPJ5jYKRMUfo2B')
 console.log(block.hash.length)
 */
//console.log(jr.length)
/*
 importer('./block.js',{bc: bc}, (err, url)=>{
 if(err){
 throw err
 }
 console.log(url.toString())
 bc.get(url.descriptorHash, (err, block) =>{
 if (err){
 throw err
 }
 console.log('Retrieved: ' + block.key)
 })
 })*/
/*
 let offUrl = new OffUrl()


 let bc= new BlockCache('../block_cache')

 let block1 = Block.randomBlock()
 let block2 = Block.randomBlock()
 let parity = Block.parityBlock(block1, block2)
 let rs= fs.createReadStream('test.pdf')
 let url = new OffUrl()
 url.contentType = mime.lookup('test.pdf')
 url.fileName= 'test.pdf'
 let ws= new ows({ path: '../block_cache', url: url})
 /*
 rs.on('error', (err)=> {throw err})
 rs.on('end', ()=>{ console.log('read stream ended')})
 rs.on('data', (data)=>{ console.log('data event: ' + data.length)})
 */
/*
 ws.on('error', (err)=> {throw err})
 ws.on('url', (url) => {
 console.log(url)
 console.log(url.descriptorHash)
 bc.get(url.descriptorHash, (err, block) =>{
 if (err){
 throw err
 }
 console.log('Retrieved: ' + block.data.length)
 })
 })

 ws.on('finish', () => console.log('write stream ended'))
 ws.on('unpipe', () => console.log())
 rs.pipe(ws)
 */
/*
 ws.on('url', (url) => {
 console.log(url.toString())
 let rs=  new ors(url, '../block_cache')
 let ws= fs.createWriteStream('../test.pdf')
 rs.on('error', (err)=>{
 console.log(err)
 })
 rs.on('unpipe', ()=>{
 console.log('unpipe')
 })
 rs.on('end', ()=>{
 console.log('end')
 })
 setTimeout(()=>{
 console.log(rs.isPaused())
 }, 10000)
 rs.pipe(ws)
 })

 rs.pipe(ws)
 /*
 bc.get('Qmf1Sb4BHCzDoho8RWzUquBdLbr3q9twCA9u88ExRobV5q', (err, block) =>{
 if (err){
 throw err
 }
 let zeroes = new Buffer(1)
 zeroes = zeroes.fill(0)
 let end = block.data.indexOf(zeroes)

 let keybuf = block.data.slice(0, end)
 let keys = keybuf.length / 46
 let lastKey = keybuf.slice(keybuf.length -46, keybuf.length)
 console.log(lastKey.length)
 console.log(lastKey.toString('utf8'))
 let blocks = []
 for(let i = 0; i< keybuf.length; i += 46){
 let block=  keybuf.slice(i, (i+46)).toString('utf8')
 blocks.push(block)
 }
 console.log(blocks)
 /*
 bc.get(lastKey.toString('utf8'), (err, block) =>{
 console.log('I got a block')
 })*/
//})

/*
 console.log(block1.key)
 console.log(block2.key)
 console.log(parity.key)
 console.log(new Buffer(parity.key).length)
 console.log(new Buffer(block1.key).length)
 console.log(new Buffer(0))
 console.log(new Buffer('QmPAzXt9NLQRJwPN4VfcwULc5AKgpcKmZi9BfMzUDZBmY6').length)
 console.log(new Buffer('QmNXgJxccMPXg25vVKykPfNr6zT3Cf9yJvd6RxJfN3mZtX').length)
 console.log(util.hash(block1.data).length)
 */
/*
 console.log(block1.parity(block2))

 bc.put(block1,(err)=>{
 if (err){
 throw err
 }
 console.log('done')

 bc.get('Qmaf8LY7jZa2jrPgLUoDxm1pyKVgeqCXoCveBv6kMTdrAs', (err, block) =>{
 if (err){
 throw err
 }
 console.log('Retrieved: ' + block.key)
 })

 })

 bc.randomBlocks(3,(err, blocks)=>{
 if(err){
 throw err
 }
 console.log(blocks)
 })*/