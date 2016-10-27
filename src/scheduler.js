const RPC = require('./rpc')
const Bucket = require('./bucket')
const CronJob = require('cron').CronJob
let _maintenanceJob = new WeakMap()
module.exports = class Scheduler {
  constructor (rpc, bucket) {
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
          bucket.add(peer)
        }
        i++
        if (i < peers.length) {
          rpc.ping(peer[ i ].id, next)
        }
      }
      next()
    }
    bucket.on('ping', onPing)
    let maintainBucket = ()=> {
      let nodes = bucket.toArray()
      for (let i = 0; i < nodes.length; i++) {
        let node = nodes[ i ]
        rpc.ping(node.id, ()=> {})
      }
    }
    let maintenanceJob = new CronJob('*/15 * * * *', maintainBucket) // every 15 minutes
    _maintenanceJob.set(this, maintenanceJob)

  }
}