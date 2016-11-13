const expect = require('chai').expect
const Block = require('../src/block')
const crypto = require('crypto')
const config = require('../config')

describe('testing block functionality', function () {
  it('testing invalid instantiation parameter errors', function () {
    // test against no parameters
    try {
      let block1 = new Block()
    }
    catch (ex) {
      expect(ex).to.exist
      expect(ex).instanceof(TypeError)
      expect(ex.message).to.equal('Block must be constructed with data')
    }
    //test against bogus block size
    try {
      let block2 = new Block(new Buffer(0), {})
    }
    catch (ex) {
      expect(ex).to.exist
      expect(ex).instanceof(TypeError)
      expect(ex.message).to.equal('Block size must be an integer')
    }
    //test against oversized data
    try {
      let data = crypto.randomBytes(1000)
      let block3 = new Block(data, 256)
    }
    catch (ex) {
      expect(ex).to.exist
      expect(ex).instanceof(Error)
      expect(ex.message).to.equal('Invalid block size for this data size')
    }
  })
  it('testing invalid instantiation parameter errors', function () {
    // test against no parameters
    try {
      let block1 = new Block()
    }
    catch (ex) {
      expect(ex).to.exist
      expect(ex).instanceof(TypeError)
      expect(ex.message).to.equal('Block must be constructed with data')
    }
    //test against bogus block size
    try {
      let block2 = new Block(new Buffer(0), {})
    }
    catch (ex) {
      expect(ex).to.exist
      expect(ex).instanceof(TypeError)
      expect(ex.message).to.equal('Block size must be an integer')
    }
    //test against oversized data
    try {
      let data = crypto.randomBytes(1000)
      let block3 = new Block(data, 256)
    }
    catch (ex) {
      expect(ex).to.exist
      expect(ex).instanceof(Error)
      expect(ex.message).to.equal('Invalid block size for this data size')
    }
  })
  describe('Test Block Methods and Properties', function () {
    let blockData = crypto.randomBytes(config.blockSize)
    let miniData = crypto.randomBytes(config.miniBlockSize)
    let nanoData = crypto.randomBytes(config.nanoBlockSize)
    let blockBlock
    let miniBlock
    let nanoBlock
    it('Test New Block Creation', function () {
      blockBlock = new Block(blockData, config.blockSize)
      expect(Buffer.compare(blockBlock.data, blockData)).to.equal(0)
      miniBlock = new Block(miniData, config.miniBlockSize)
      expect(Buffer.compare(miniBlock.data, miniData)).to.equal(0)
      nanoBlock = new Block(nanoData, config.nanoBlockSize)
      expect(Buffer.compare(nanoBlock.data, nanoData)).to.equal(0)
    })
    it('Test Hash and Key', function () {
      blockBlock = new Block(blockData, config.blockSize)
      expect(Buffer.compare(blockBlock.data, blockData)).to.equal(0)
      miniBlock = new Block(miniData, config.miniBlockSize)
      expect(Buffer.compare(miniBlock.data, miniData)).to.equal(0)
      nanoBlock = new Block(nanoData, config.nanoBlockSize)
      expect(Buffer.compare(nanoBlock.data, nanoData)).to.equal(0)
    })


  })
})