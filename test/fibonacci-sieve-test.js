const FibonacciSieve = require('./../src/fibonacci-sieve')
const config = require('./../src/config')
const util = require('./../src/utility')
let sieve = new FibonacciSieve(config.filterSize, config.bucketSize, config.fingerprintSize, config.scale, 3)
let data = []
for (let i = 0; i < 200; i++) {
  data.push(`${i}`)
  sieve.tally(data[i])
}

for (let i = 0; i < 500; i++) {
  sieve.tally(data[util.getRandomInt(0, 200)])
}
console.log('stop')
let sieve2 = FibonacciSieve.fromCBOR(sieve.toCBOR())
for (let i = 0; i < 200; i++) {
  console.log(data[i], sieve2.number(data[i]))
}