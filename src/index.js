'use strict'
const Block = require('./block.js')
const BlockCache = require('./block-cache')
const util = require('./utility')
const fs =  require('fs')
const ows = require('./writable-off-stream')
const ors= require('./readable-off-stream')
const through = require('through2')
const OffUrl = require('./off-url')

let offUrl = new OffUrl()


let bc= new BlockCache('../block_cache')

let block1 = Block.randomBlock()
let block2 = Block.randomBlock()
let parity = Block.parityBlock(block1, block2)
let rs= fs.createReadStream('test.pdf')
let ws= new ows('../block_cache')

rs.on('error', (err)=> {throw err})
//rs.on('end', ()=>{ console.log('read stream ended')})
//rs.on('data', (data)=>{ console.log('data event: ' + data.length)})

ws.on('error', (err)=> {throw err})
/*ws.on('url', (url) => {
  console.log(url)
  console.log(url.descriptorHash)
  bc.get(url.descriptorHash, (err, block) =>{
    if (err){
      throw err
    }
    console.log('Retrieved: ' + block.data.length)
  })
})*/
ws.on('finish', () => console.log('write stream ended'))
ws.on('unpipe', () => console.log())
rs.pipe(ws)


ws.on('url', (url) => {
  let rs=  new ors(url, '../block_cache')
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
  rs.pipe(through((buf, enc, nxt)=>{
    nxt()
  }))
})
/*
rs.pipe(ws)*/
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