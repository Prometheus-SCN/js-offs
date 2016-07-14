const OffUrl = require('./off-url')
_content = new WeakMap()
_name = new WeakMap()
_size = new WeakMap()
module.exports = class Directory {
  constructor (name) {
    if (typeof name !== 'string'){
      throw new Error('Invalid name')
    }
    if(name.lastIndexOf('.ofd') === -1 && (name.substring(name.length-4 , name.length-1).indexOf('.ofd') === -1)){
      name = name + '.ofd'
    }
    _name.set(this, name)
    _content.set(this, [])
    _size.set(this, 0)
  }

  add (url) {
    if (!(url instanceof OffUrl )) {
      throw new Error('Invalid off url')
    }

    if (!content.find((txt)=> { return txt === url.toString() || txt.indexOf(url.fileName) !== -1})) {
      let content = _content.get(this)
      let size= _size.get(this)
      size += url.size
      content.push(url.toString())
      _content.set(this, content)
      _size.set(this, size)
    } else{
      throw new Error('Folder contains a duplicate file name')
    }
  }

  remove (url) {
    if (!(url instanceof OffUrl )) {
      throw new Error('Invalid off url')
    }
    let content = _content.get(this)
    content = content.filter((txt) =>{ txt !== url.toString()})
    _content.set(this, content)
  }

  get size () {
    return _size.get()
  }
  get content(){
    return _content.get(this)
  }

  toBuffer () {
    return new Buffer(this.content.join('\n'))
  }
  static mimeType(){
    return 'offsystem/directory'
  }
}
