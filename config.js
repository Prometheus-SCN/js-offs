const kb = 1000
const mb = 1000000
const gb = 1000000000
module.exports = {
  blockPath:'.block-cache',
  miniPath: '.mini-cache',
  nanoPath: '.nano-cache',
  blockCacheSize: 200 * gb,
  miniBlockCacheSize: 23 * gb,
  nanoBlockCacheSize: 200 * mb,
  nano: 3,
  block: 1,
  mini: 2,
  tupleSize: 3,
  blockSize: 128000,
  miniBlockSize: 1000,
  nanoBlockSize: 134,
  descriptorPad: 34,
  scale: 2,
  filterSize: 20000,
  fingerprintSize: 8,
  hitBoxSize: 100,
  bucketSize: 4,
  startPort: 8200,
  numPortTries : 2,
  timeout: 60000, // how long to wait on a rpc response
  packetSize: 512, // message size in bytes
  nodeCount: 10, // how many nodes to find in or query in total
  concurrency:3, // how many nodes to query simultaneously
  kbucketSize: 20, // size of each k bucket
  storeCount: 1, // how many nodes to store new data at
  maxFillRate: 72, // in hours
  redundancy: .30, //30% network redundancy target
  batchConcurrency: 10
}
