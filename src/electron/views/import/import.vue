<template>
  <div>
    <div id="container">
      <div id="dropzone" ref="dropzone">
        <div ref="recycle" class="recycle-container">
          <a v-if="!isLoading" class="recycle-link" @click="toggleRecycler"><i class="fa fa-recycle fa-3x recycle-icon"></i></a>
          <div class="recycle-form">
            <label class="label">Enter Off System Links (comma-delimited)</label>
            <textarea class="textarea" v-model="links" :class="badLinks ? 'is-danger' : ''"></textarea>
            <span v-if="badLinks" class="error has-text-danger">Invalid links</span>
          </div>
        </div>
        <h3 id="uploadMessage">{{message}}</h3>
        <img id="uploadIcon" ref="icon" src="../../images/upload.svg" class="upload">
      </div>
    </div>
    <div id="dztrash" ref="dztrash" style="display:none"></div>
    <div ref="completeModal" class="modal">
      <div class="modal-background"></div>
      <div class="modal-content">
        <div class="notification is-rounded has-text-centered">
          <h1 id="title" class="title">
            Import complete!
          </h1>
          <div class="field has-addons">
            <p class="control">
              <input class="input" id="link" type="text" v-model="link">
            </p>
            <p class="control">
              <a class="button is-info" id="copy" data-clipboard-target="#link"  @click="copyLink">
                <span class="icon is-small">
                  <i class="fa fa-clipboard"></i>
                </span>
                <span>Copy</span>
              </a>
            </p>
          </div>
        </div>
      </div>
      <div class="modal-close" @click="toggleModal"></div>
    </div>
  </div>
</template>
<style scoped>
  #dropzone {
    position: relative;
  }
  .notification {
    word-wrap: break-word;
  }
  .title, .notification {
    font-family: Odin;
  }
  .recycle-container {
    position: absolute;
    height: 100%;
    width: 100%;
    z-index: 20;
    transition: .5s;
  }
  .recycle-container.expanded {
    transition: .5s;
    background-color: white;
    outline: 5px;
  }
  .recycle-container > .recycle-form {
    display: none;
  }
  .recycle-container.expanded > .recycle-form {
    display: block;
  }
  .recycle-link {
    position: absolute;
    top: 13px;
    right: 13px;
  }
  .recycle-icon {
    color: #53b998;
  }
  .recycle-icon:hover {
    opacity: .8;
  }
  .label {
    position: absolute;
    top: 10%;
    color: grey;
  }
  .textarea {
    position: absolute;
    top: 50%;
    left: 50%;
    height:60%;
    width: 60%;
    transform: translate(-50%, -50%);
  }
  .error {
    position: absolute;
    bottom: 10%;
  }
</style>
<script>
window.$ = require('../../scripts/jquery-3.1.1.min.js')
var Dropzone = require('./../../scripts/dropzone')
function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export default {
  mounted () {
    var dropzone = new Dropzone(this.$refs.dropzone , {
      url: 'http://localhost:23402/offsystem',
      previewsContainer: this.$refs.dztrash,
      uploadMultiple: false,
      autoProcessQueue: false
    })
    dropzone.on('drop', (e) => {
      if (this.expanded) {
        return
      }
      this.isDropped = true
      this.startLoader()
      for (var i = 0; i < e.dataTransfer.items.length; i++) {
        var entry = e.dataTransfer.items[ i ].webkitGetAsEntry();
        this.importer(entry, this.complete)
      }
    })
    dropzone.on('addedfile', (file) => {
      if (this.expanded) {
        return
      }
      if (!this.isDropped && (file instanceof File)) {
        this.startLoader()
        this.uploadFile(file, this.complete)
      }
    })
  },
  watch: {
    links () {
      if (this.links) {
        let links = this.links.split(',')
        for (let i = 0; i < links.length; i++) {
          try {
            links[i] = links[i].trim()
            OffUrl.parse(links[i])
          } catch (ex) {
            console.log(ex)
            this.badLinks = true
            this.urls = null
            return
          }
        }
        this.badLinks = false
        this.urls = links
      } else {
        this.badLinks = false
        this.urls = null
      }
    }

  },
  data: function () {
    return {
      message: 'Drag and Drop a File or Folder',
      timer: null,
      isDropped: false,
      isLoading: false,
      messages: [ 'Dissolving', 'Dissolving.', 'Dissolving..', 'Dissolving...' ],
      links: null,
      urls: null,
      badLinks: false,
      expanded: false
    }
  },
  methods: {
    toggleRecycler () {
      this.$refs.recycle.classList.toggle('expanded')
      this.expanded = !this.expanded
    },
    toggleModal () {
      if ($(this.$refs.completeModal).hasClass('is-active')) {
        $(this.$refs.completeModal).removeClass('is-active')
        this.link = null
      } else {
        $(this.$refs.completeModal).addClass('is-active')
      }
    },
    copyLink() {
      clipboard.writeText(this.link)
    },
    uploadFile (file, name, type, cb) {
      if (typeof type === 'function') {
        cb = type
        type = null
      }
      if (typeof name === 'function') {
        cb = name
        name = null
      }
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', 'http://localhost:23402/offsystem', true);
      xhr.setRequestHeader('server-address', 'http://localhost:23402');
      xhr.setRequestHeader('type', type || file.type || 'application/octet-stream');
      let urls = this.urls
      if (urls) {
        xhr.setRequestHeader('recycler', JSON.stringify(urls));
      }
      xhr.setRequestHeader('file-name', name || file.name);
      xhr.setRequestHeader('stream-length', file.size);
      xhr.addEventListener('load', (e) => {
        progressJs().end()
        if (e.target.status === 200) {
          return cb(null, e.target.responseText)
        } else {
          return cb(e.target.responseText)
        }
      })
      xhr.addEventListener('error', function () {
        progressJs().end()
        return cb(new Error('Upload Failure'))
      })
      xhr.upload.addEventListener('progress', function (e) {
        progressJs().set((e.loaded / e.total) * 100)
      })
      progressJs().start()
      xhr.send(file);
    },
    startLoader () {
      this.message = 'Dissolving...'
      this.isLoading = true
      let i = 0;
      this.timer = setInterval(() => {
        i++
        this.message = this.messages[i % this.messages.length ]
      }, 500);
      this.$refs.icon.setAttribute('src', '../../images/Preloader_' + getRandomInt(1, 7) + '.gif');
      this.$refs.dropzone.setAttribute('style', "background-color: #fff; outline: 5px solid #fff;")
    },
    endLoader () {
      this.toggleModal()
      this.isLoading = false
      clearInterval(this.timer)
      this.message = 'Drag and Drop a File or Folder'
      this.$refs.icon.setAttribute('src', '../../images/upload.svg')
      this.$refs.dropzone.setAttribute('style', "")
    },
    complete (err, url) {
      if (err) {
        this.link = err.toString()
      } else {
        this.link = url
      }
      this.isDropped = false
      setTimeout(this.endLoader, 1000)
    },
    importer (entry, cb) {
      if (entry.isFile) {
        entry.file((file) => {
          this.uploadFile(file, cb)
        })
      } else if (entry.isDirectory) {
        let ofd = {}
        let name = entry.name + '.ofd'
        this.dirImporter(entry, ofd, entry, () => {
          let keys = Object.keys(ofd)
          let i = -1
          let next = (err, url) => {
            if (err) {
              return cb(err)
            }
            if (url) {
              ofd[ keys[ i ] ] = url
            }
            i++
            if (i < keys.length) {
              this.uploadFile(ofd[ keys[ i ] ], next)
            } else {
              let text = JSON.stringify(ofd)
              let file = new File([ text ], { type: 'text/plain' })
              this.uploadFile(file, name, 'offsystem/directory', (err, url) => {
                if (err) {
                  return cb(err)
                }
                return cb(err, url)
              })
            }
          }
          next()
        })
      }
    },
    dirImporter (entry, ofd, dir, cb) {
      //remove the first directory from the path
      var dirPath
      if (dir === entry) {
        dirPath = ''
      } else {
        dirPath = (dir ? dir + '/' : '') + entry.name
      }
      if (entry.isFile) {
        entry.file((file) => {
          ofd[ dirPath ] = file
          return cb()
        })
      } else if (entry.isDirectory) {
        var dirReader = entry.createReader()
        dirReader.readEntries((entries) => {
          var i = -1
          var next = () => {
            i++
            if (i < entries.length) {
              this.dirImporter(entries[ i ], ofd, dirPath, next)
            } else {
              return cb()
            }
          }
          next()
        })
      }
    }
  }
}
</script>
