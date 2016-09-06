const Bloom= require('./scalable-bloom-filter')
const Sieve = require('./bloom-sieve')
const config = require('../config')
const _lower = new WeakMap()
const _contents = new WeakMap()
const _hitBox = new WeakMap()
const _number = new WeakMap()
const _limit = new WeakMap()
function fibSequence(){
  let output = 0
  for (var i = 0; i < num; i++) {
    sequence.push(sequence[0] + sequence[1])
    sequence.splice(0, 1)
    output = sequence[1]
  }
  return output
}

module.exports = class FibonacciBucket{
  construct(number, contents, hitBox){
    if (!number){
      number = 1
    }
    _number.set(this, 1)
    _limit.set(this, fibSequence(number))
    if(!contents){
      contents = new Bloom(1, config.failureRate, config.scale)
    }
    _contents.set(this, contents)
    if(!hitBox){
      hitBox = new Sieve(config.failureRate, config.scale)
    }
    _hitBox.set(this, hitBox)
  }
  contains(item){

  }
}