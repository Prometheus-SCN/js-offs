'use strict'
const fs = require('fs')
const Block = require('./block')
const mkdirp = require('mkdirp')
const pth = require('path')
let _path = new WeakMap()
let _blocks = new WeakMap()
let _usageSessions = new WeakMap()
let _sessionCounter = 0
let _sessions = new WeakMap()

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

function getRandomInt (min, max) {
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
      _sessions.set(this, [])
    }

    get path () {
      return _path.get(this)
    }

    put (block, usageSession, cb) {
      if (typeof usageSession === 'function') {
        cb = usageSession
        usageSession = null
      }

      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }

      if (!(block instanceof Block)) {
        return process.nextTick(()=> {cb(new Error('Invalid Block'))})
      }

      this.has(block.key, (found)=> {
        if (!found) {
          let fd = sanitize(block.key, this.path)

          let blocks = this.blocks
          blocks.push(block.key)
          _blocks.set(this, blocks)

          if (usageSession) {
            let sessions = _sessions.get(this)
            let remove = []

            for (let i = 0; i < sessions.length; i++) {
              let session = sessions[ i ]
              if (session.id !== usageSession.id) {
                let items = _usageSessions.get(session)
                if (items) {
                  items.push(block.key)
                  _usageSessions.set(session, items)
                } else {
                  remove.push(session)
                }
              }
            }
            for (let i = 0; i < remove.length; i++) {
              this.endSession(remove[ i ])
            }
          }
          fs.writeFile(fd, block.data, cb)
        } else {
          return process.nextTick(cb)
        }
      })
    }

    endSession (usageSession) {
      let sessions = _sessions.get(this)
      sessions = sessions.filter((session)=> {
        return session.id === usageSession.id
      })
      _sessions.set(this, sessions)
    }

    get blocks () {
      return _blocks.get(this)
    }

    load (cb) {
      fs.readdir(this.path, (err, items)=> {
        if (err) {
          return process.nextTick(()=> {cb(err)})
        }
        _blocks.set(this, items)
        return process.nextTick(cb)
      })
    }

    get (key, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }
      let fd = sanitize(key, this.path)
      fs.readFile(fd, (err, buf) => {
        if (err) {
          return process.nextTick(()=> {cb(err)})
        } else {
          return process.nextTick(()=> {cb(null, new Block(buf))})
        }
      })
    }

    has (key, cb) {
      if (!cb || typeof cb !== 'function') {
        throw new Error('Invalid Callback')
      }
      if (this.blocks) {
        let found = this.blocks.find((block)=> { return key === block})
        return process.nextTick(()=> {cb(!!found)})
      } else {
        this.load((err)=> {
          if (err) {
            return process.nextTick(()=> {cb(err)})
          }
          let found = this.blocks.find((block)=> { return key === block})
          return process.nextTick(()=> {cb(!!found)})
        })
      }
    }

    randomBlocks (number, usageSession, cb) {
      if (isNaN(number)) {
        return process.nextTick(()=> {cb(new Error('Invalid Number'))})
      }
      if (typeof usageSession === 'function') {
        cb = usageSession
        usageSession = null
      }

      let getSession = ()=> {
        if (!usageSession) {
          usageSession = { id: _sessionCounter }
          _sessionCounter++
          _usageSessions.set(usageSession, this.blocks.slice(0))
        }
        let items = _usageSessions.get(usageSession)
        number = Math.floor(number)
        let blockArray = []
        let commit = false

        if (items.length < number) {
          commit = true
          for (let i = 0; i < (number - items.length); i++) {
            blockArray.push(Block.randomBlock())
          }
        }
        if (blockArray.length < number) {
          let visit = []
          for (let i = 0; i < (number - blockArray.length); i++) {
            let next = getRandomInt(0, items.length)
            while (visit.find((num)=> next === num)) {
              next = getRandomInt(0, items.length)
            }
            visit.push(next)
          }
          let i = -1
          let next = (err, block)=> {
            if (err) {
              return process.nextTick(()=> {cb(err, usageSession)})
            }
            if (block) {
              blockArray.push(block)
            }

            i++
            if (i < visit.length) {
              this.get(items[ visit[ i ] ], next)
            } else {
              if (commit) {
                let i = -1
                let commit = (err)=> {
                  if (err) {
                    return process.nextTick(()=> {cb(err, usageSession)})
                  }
                  i++
                  if (i < blockArray.length) {
                    this.put(blockArray[ i ], usageSession, commit )
                  } else {
                    return process.nextTick(()=> {cb(null, usageSession, blockArray)})
                  }
                }
                commit()
              } else {
                for( let i =0; i < visit.length; i++){
                  items= items.splice(0, visit[i])
                }
                _usageSessions.set(usageSession, items)
                return process.nextTick(()=> {cb(null, usageSession, blockArray)})
              }
            }
          }
          next()
        } else {
          if (commit) {
            let i = -1
            let commit = (err)=> {
              if (err) {
                return process.nextTick(()=> {cb(err, usageSession)})
              }
              i++
              if (i < blockArray.length) {
                this.put(blockArray[ i ], usageSession, commit)
              } else {
                return process.nextTick(()=> {cb(null, usageSession, blockArray)})
              }
            }
            commit()
          } else {
            return process.nextTick(()=> {cb(null, usageSession, blockArray)})
          }
        }
      }
      if (this.blocks) {
        getSession()
      } else {
        this.load((err)=> {
          if (err) {
            return process.nextTick(()=> {cb(err)})
          }
          getSession()
        })
      }
    }

  }
