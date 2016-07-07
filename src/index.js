'use strict'

const Block = require('./block.js')
const BlockCache = require('./block-cache')
const util = require('./utility')

let bc= new BlockCache('../block_cache')

let block1 = Block.randomBlock()
let block2 = Block.randomBlock()
let parity = Block.parityBlock(block1, block2)

console.log(block1.key)
console.log(block2.key)
console.log(parity.key)
console.log((new Buffer("|" + JSON.stringify([parity.key]))).length)
//console.log(parity.parity(block2).key)

bc.put(block1,(err)=>{
  if (err){
    throw err
  }
  console.log('done')
  /*
  bc.get('Qmaf8LY7jZa2jrPgLUoDxm1pyKVgeqCXoCveBv6kMTdrAs', (err, block) =>{
    if (err){
      throw err
    }
    console.log('Retrieved: ' + block.key)
  })
  */
})

bc.randomBlocks(3,(err, blocks)=>{
  if(err){
    throw err
  }
  console.log(blocks)
})