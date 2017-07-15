'use strict'
const RPC = require('./rpc')
const Bucket = require('./bucket')
const CronJob = require('cron').CronJob
const TimerJob = require('timer-jobs')
const config = require('./config')
const bs58 = require('bs58')
let _maintenanceJob = new WeakMap()
let _capacityJob = new WeakMap()
module.exports = class Scheduler {
  constructor (rpc, bucket, block, mini, nano) {
    if (!(rpc instanceof RPC )) {
      throw new TypeError('Invalid RPC')
    }
    if (!(bucket instanceof Bucket )) {
      throw new TypeError('Invalid Bucket')
    }
    let onPing = (peers, peer)=> {
      let i = -1
      let next = (err)=> {
        if (err) {
          bucket.remove(peer[ i ])
          bucket.add(peer)
        }
        i++
        if (i < peers.length) {
          rpc.ping(peer[ i ].id, next)
        }
      }
      next()
    }

    let capacityJob = (bc, type) => {
      let isCleaning = false
      let clean = (bc) => {
        //1. gather all blocks in the cache
        //2. Figure figure out which blocks are already contained at 30% of their current bucket contacts in order of lowest popularity first
        //3. Delete blocks that are 30% redundant until capacity is down to 50%
        //4. If not possible to reach 50% redistribute blocks that are less then 30% redundant and then delete
        //5. If not possible to redistribute sleep until more connections obtained
        isCleaning = true
        let pingBlock = (key, cb)=> {
          let redundancy = Math.floor(bucket.count * config.redundancy)
          redundancy = (redundancy < 1 && bucket.count > 0) ? 1 : redundancy
          let count = 0
          let hash = new Buffer(bs58.decode(key))
          let peers = bucket.closest(hash, bucket.count)
          //loop through peers
          let i = -1
          let next = (err)=> {
            if (err) {
              count--
            }
            if (i > -1) {
              count++
            }
            //if proper amount of redundancy exists then
            if (count >= redundancy) {
              //delete Block
              bc.remove(key, (err)=> {
                if (err) {
                  console.log(err)
                  //TODO: Decide what to do when this fails
                }
                console.log('happened')
                return process.nextTick(cb)
              })
            }
            i++
            if (i < peers.length) {
              return rpc.pingValue(peers[ i ].id, hash, type, next)
            } else {
              return process.nextTick(()=> {
                return cb(new Error("Insufficient Peer Redundancy"))
              })
            }
          }
          next()
        }

        let redistribute = []
        //1. Go Through each block marked for  redistribution and retrieve it
        //2. Store it on the network
        //3. Delete it
        let redistributeBlocks = ()=> {
          let i = -1
          let next = (err, block)=> {
            if (err) {
              console.log(err)
            }
            // stop once capacity is below 50%
            if (bc.capacity <= 50) {
              isCleaning = false
              return
            }
            i++
            if (i < redistribute.length) {
              let key = redistribute[ i ]
              bc.get(key, (err, block, number)=> {
                if (err) {
                  return next(err)  //TODO: Figure out what to do when it fails
                }
                rpc.store(block.hash, type, block.data, number, (err)=> {
                  if (err) {
                    return next(err)  //TODO: Figure out what to do when it fails
                  }
                  bc.remove(key, next)
                })
              })
            } else {
              isCleaning = false
              //TODO: figure out what happens at the end
            }
          }
        }
        let loopContent = (err, content)=> {
          if (err) {
            //console.log(err) //TODO: Figure out what happens when this fails
          }
          let i = -1
          let key
          let next = (err)=> {
            if (err) {
              redistribute.push(key)
            }
            i++
            if (i < content.length) {
              key = content[ i ]
              return pingBlock(key, next)
            } else {
              return process.nextTick(redistributeBlocks)
            }
          }
          next()
        }
        /*
         let stop = bc.number
         let i = 0
         //Loop through all block buckets
         let next = (err, content)=> {
         //increment the loop and get next bucket's content
         let increment = ()=> {
         console.log(stop)
         i++
         if (i <= stop) {
         console.log(bc)
         return bc.contentAt(i, next)
         }
         else {
         // if the capacity  is  above 50% still
         // then go through the redistribution list and try to store at other nodes
         return redistributeBlocks()
         }
         }
         if (err) {
         //TODO: Figure out WTF to do when this fails
         }
         //ping bucket contacts until 30% of contacts respond with a value
         if (content) {
         loopContent(content, ()=> {
         //cleared enough space
         if (bc.capacity <= 50) {
         isCleaning = false
         return
         } else {
         return increment()
         }
         })
         } else {
         return increment()
         }
         }
         next()*/
        bc.content(loopContent)
      }
      let isRunningCapacity = false
      let onCapacity = (capacity)=> {
        let fillRate
        let capacityJob = _capacityJob.get(bc)
        if (capacityJob) {
          isRunningCapacity = false
          clearInterval(capacityJob)
        }
        if (capacity >= 50) {
          fillRate = config.maxFillRate
          if (capacity >= 80) { //TODO: Figure out what to do at 80%
            if (isCleaning) { //if process has begun do not restart it
              return
            }
            if (bucket.count < 1) {
              bucket.once('added', () => { return clean(bc)})
            } else {
              return clean(bc)
            }
          }
        } else {
          fillRate = Math.floor(config.maxFillRate * (capacity / 50))
        }
        let then = Math.ceil(fillRate * 60 * 60 * 1000)
        then = then < 0 ? 1000 : then
        then = then < 2000 ? 2000 : then
        let job = ()=> {
          if (isRunningCapacity) {
            return
          }
          isRunningCapacity = true
          bc.contentFilter((err, contentFilter)=> {
            if (err) {
              console.log(err)
              return //TODO: Decide what happens when this fails
            }
            rpc.random(0, 1, type, contentFilter, ()=> {
              isRunningCapacity = false
            })
          })
        }
        capacityJob = setInterval(job, then)
        _capacityJob.set(bc, capacityJob)
      }
      bc.on('capacity', onCapacity)
    }
    capacityJob(block, config.block)
    capacityJob(mini, config.mini)
    capacityJob(nano, config.nano)

    bucket.on('ping', onPing)
    let maintainBucket = ()=> {
      let nodes = bucket.toArray()
      let i = -1
      let next = (err)=> {
        if (err) {
          bucket.remove(nodes[ i ])
        }
        i++
        if (i < nodes.length) {
          let node = nodes[ i ]
          rpc.ping(node.id, next)
        }
      }
      next()
    }
    let maintenanceJob = new CronJob('*/15 * * * *', maintainBucket) // every 15 minutes
    _maintenanceJob.set(this, maintenanceJob)

  }

}
