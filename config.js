module.exports = {
  blockPath:'.block-cache',
  miniPath: '.mini-cache',
  nanoPath: '.nano-cache',
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
  startPort: 7200,
  numPortTries : 2,
  timeout: 60000, // how long to wait on a rpc response
  packetSize: 512, // message size in bytes
  nodeCount: 10, // how many nodes to find in or query in total
  concurrency:3, // how many nodes to query simultaneously
  kbucketSize: 20, // size of each k bucket
  storeCount: 1 // how many nodes to store new data at
}
