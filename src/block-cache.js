const fs = require('fs')
const Block = require('./block')
const mkdirp = require('mkdirp')
var pth = require('path');
let _path = new WeakMap()

function sanitize (key, path) {
  if (typeof key === 'string') {
    if (key.indexOf(path) === -1) {
      return pth.join(path, key)
    } else {
      return key
    }
  } else {
    throw new Error("Invalid Key")
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

module.exports =
  class BlockCache {
    constructor (path) {
      if (!path || typeof path !== 'string') {
        throw new Error('Invalid path')
      }
      mkdirp.sync(path)
      _path.set(this, path)
    }

    get path () {
      return _path.get(this)
    }

    put (block, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }
      if (!(block instanceof Block)) {
        return cb(new Error('Invalid Block'))
      }

      this.has(block.key, (found, fd)=> {
        if (!found) {
          fs.writeFile(fd, block.data, cb)
        } else {
          return cb()
        }
      })
    }

    get (key, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }
      let fd = sanitize(key, this.path)
      fs.readFile(fd, (err, buf) => {
        if (err) {
         return cb(err)
        } else {
          return cb(null, new Block(buf))
        }
      })
    }

    has (key, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }
      let fd = sanitize(key, this.path)
      fs.stat(fd, (err)=> {
        if (err) {
          return cb(false, fd)
        } else {
          return cb(true, fd)
        }
      })
    }

    randomBlocks (number, used, cb) {
      if (isNaN(number)) {
        return cb(new Error('Invalid Number'))
      }
      if(typeof used === 'function'){
        cb= used
        used=[]
      }
      number = Math.floor(number)
      let blockArray = []
      let commit = false
      fs.readdir(this.path, (err, items)=> {
        if (err) {
          return cb(err)
        }

        items = items.filter((block)=>{
          return !(used.find((key)=> key === block))
        })

        if (items.length < number) {
          commit= true
          for (let i = 0; i < (number - items.length); i++) {
            blockArray.push(Block.randomBlock())
          }
        }
        if (blockArray.length < number){
          let visit= []
          for (let i = 0; i < (number - blockArray.length); i++) {
            let next = getRandomInt(0, items.length)
            while(visit.find((num)=> next=== num)){
              next = getRandomInt(0, items.length)
            }
            visit.push(next)
          }
          let i = -1
          let next= (err, block)=>{
            if(err){
              return cb(err)
            }
            if (block) {
              blockArray.push(block)
            }
            i++
            if(i < visit.length){
              this.get(items[visit[i]], next)
            } else {
              if (commit){
                let i = -1
                let commit = (err)=>{
                  if(err){
                    return cb(err)
                  }
                  i++
                  if( i < blockArray.length){
                    this.put(blockArray[i], commit)
                  } else {
                    return cb(null, blockArray)
                  }
                }
                commit()
              } else{
                return cb(null, blockArray)
              }
            }
          }
          next()
        } else {
          if (commit){
            let i = -1
            let commit = (err)=>{
              if(err){
                return cb(err)
              }
              i++
              if( i < blockArray.length){
                this.put(blockArray[i], commit)
              } else {
                return cb(null, blockArray)
              }
            }
            commit()
          } else{
            return cb(null, blockArray)
          }
        }
      })

    }

  }
