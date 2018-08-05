<template>
  <div ref="container">
    <div ref="fileStatus">
      <div class="file-status" v-for="(file, index) in files" v-show="file.show">
        <div class="icontainer">
          <img :class="file.error ? 'loader-icon error' : 'loader-icon'" :src="file.icon" @click="openLocation(index)" >
        </div>
        <div class="file-info">
          <table>
            <tr>
              <td>
                <strong>Filename:</strong>
                {{file.filename}}
              </td>
            </tr>
            <tr>
              <td>
                <progressbar :error="file.error" :percent="file.percent"></progressbar>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
    <div class="form-container">
      <form>
        <table>
          <tr>
            <td style="padding: 5px">
              <div class="field has-addons">
                <div class="control">
                  <input class="input" disabled name="location" type="text" placeholder="Select an Export Location" v-model="location">
                </div>
                <div class="control">
                  <a class="button is-info" @click="choose">
                    Choose
                  </a>
                </div>
              </div>
              <input class="input" v-show="false" v-validate="{ required: true }" name="location" type="text" placeholder="Select an Export Location" v-model="location">
              <span v-show="errors.has('location')" class="error">{{ errors.first('location') }}</span>
              <div class="field has-addons">
                <div class="control">
                  <input class="input" name="url"
                         v-validate="{ required: true, regex: /\/offsystem\/v3\/([-+.\w]+\/[-+.\w]+)\/(\d+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)\/([^ !$`&*()+]*|\\[ !$`&*()+]*)+/ }"
                         style="width: 340px" type="text" placeholder="Enter url to export" v-model="url">
                </div>
              </div>
              <span v-show="errors.has('url') && fields.url.dirty" class="error">{{ errors.first('url') }}</span>
            </td>
            <td>
              <a class="download-button" @click="exporter">
                <h3 id="downloadMessage">Export</h3>
                <img id="downloadIcon" src="../../images/download.svg" class="download">
              </a>
            </td>
          </tr>
        </table>
      </form>
    </div>
  </div>
</template>
<style>
  strong {
    font-family: Odin;
  }
  .button {
    font-family: Odin;
  }
  .file-status {
    border-bottom: 2px solid #ced3cc;
  }
  .icontainer {
    display: flex;
    min-height: 100px;
    min-width: 100px;
    height: 100px;
    width: 100px;
    background-color: #3273dc;
    border-radius: 10px;
    margin: 5px;
  }
  .loader-icon.error {
    background-color: transparent;
  }
  .loader-icon {
    background-color: white;
    border-radius: 10px;
    height: 80px;
    width: 80px;
    margin: 50% 50%;
    transform: translate(-50%, -50%);
  }
  .form-container {
    max-height: 128px;
    max-width: 500px;
    min-height: 128px;
    min-width: 500px;
    height: 128px;
    width: 500px;
  }
  .file-info {
    display: flex;
  }
  .file-status {
    display: flex;
    flex-direction: row;
    margin: 5px;
  }

  .download-button {
    height: 100%;
    width: auto;
    min-width: 100px;
    font-family: Odin;
    background-color: #edf0f2;
    padding: 0;
    display: flex;
    border-color: #878787;
    border-style: dotted;
    border-width: 10px;
    padding: 3px;
    color: #878787;
    outline: 5px solid #edf0f2;
    margin: 5px;
    font-family: Odin;
    align-self: center;
    align-content: center;
    justify-content: center;
    flex-direction: column;
  }
  .download {
    width: 40px;
    height: 40px;
    margin: 0 auto 3px auto;
  }
  .download-button:hover h3 {
    color: #878787;
  }
  .download-button:hover {
    outline: 5px solid #878787;
  }
  .error {
    color: red;
  }
</style>
<script>
  let progressbar = require('./progressbar.vue')
  let urldecode = require('urldecode')
  function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  export default {
    components: {progressbar},
    data () {
      return {
        location: null,
        url: null,
        files: [],
        Exporter: null,
        isExpandable: true
      }
    },
    mounted () {
      this.Exporter =  new Exporter(ipcRenderer, this.onPercent, this.onError)
      let heightOffset = window.outerHeight - window.innerHeight
      let widthOffset = window.outerWidth - window.innerWidth
      let height = this.$refs.container.clientHeight + heightOffset
      let width = this.$refs.container.clientWidth + widthOffset
      window.resizeTo(width, height)
    },
    methods: {
      choose () {
        dialog.showOpenDialog({properties: [ 'openDirectory' ]}, (filePaths) => {
         if (Array.isArray(filePaths)) {
           this.location = filePaths[0]
         }
        })
      },
      onError (err) {
        this.files[err.id].error = err.err
        this.files[err.id].icon = '../../images/error.svg'
      },
      onPercent(payload) {
        this.files[payload.id].percent = payload.percent
        if (payload.percent >= 100) {
          this.files[payload.id].icon = '../../images/folder.svg'
        }
      },
      resize () {
        let heightOffset = window.outerHeight - window.innerHeight
        let widthOffset = window.outerWidth - window.innerWidth
        let height = this.$refs.container.clientHeight + heightOffset
        let width = this.$refs.container.clientWidth + widthOffset
        if (!this.isExpandable || height >= (.80 * window.screen.height)) {
          document.body.style.overflowY = 'scroll'
          //this.$refs.fileStatus.style.overflowY = 'scroll'
          //stop resizing window after the first time
          if(this.isExpandable) {
            this.isExpandable = false
            //this.$refs.fileStatus.style.maxHeight = this.$refs.fileStatus.offsetHeight
          }
        } else {
          //this.$refs.fileStatus.style.overflowY = "auto"
          //this.$refs.fileStatus.style.height = "auto"
          window.resizeTo(width, height)
        }
      },
      exporter () {
      this.$validator.validateAll()
        .then((ok) => {
          if (!ok) return
          let url = OffUrl.parse(this.url)
          let filename = path.join(this.location, urldecode(url.fileName))
          let streamLength = url.streamLength
          let percent = 0
          let size = 0
          let icon = `../../images/Preloader_${ getRandomInt(1, 7) }.gif`
          let show = true
          let error = null
          let file = {filename, percent, size, streamLength, icon, show, error}

          // Resize Window to fit
          setTimeout(this.resize, 100)
          let id = this.files.length
          this.files.push(file)
          this.Exporter.exporter(this.location, this.url, id)
          //this.location = null
          //this.url = null
          this.$validator.flag('location', {
            valid: false,
            dirty: false
          })
          this.$validator.flag('url', {
            valid: false,
            dirty: false
          })
        })
      },
      openLocation (index) {
        if (this.files[index].percent >= 100) {
          shell.showItemInFolder(this.files[index].filename)
        }
        if (this.files[index].error) {
          this.files[index].show = false
          setTimeout(this.resize, 100)
        }
      }
    }
  }
</script>
