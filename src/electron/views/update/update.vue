<template>
  <div>
    <div ref="fileStatus">
      <div class="file-status">
        <div class="icontainer">
          <img :class="error ? 'loader-icon error' : 'loader-icon'" :src="icon">
        </div>
        <div class="file-info">
          <table>
            <tr>
              <td>
                <strong>status:</strong>
                {{status}}
              </td>
            </tr>
            <tr>
              <td>
                <progressbar :error="error" :percent="percent"></progressbar>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
  strong {
    font-family: Odin;
  }
  .icontainer {
    display: flex;
    min-height: 100px;
    min-width: 100px;
    height: 100px;
    width: 100px;
    background-color: #f4d8c0;
    border-radius: 10px;
    margin: 5px;
  }
  .loader-icon.error {
    background-color: transparent;
  }
  .loader-icon {
    background-color: transparent;
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
  .error {
    color: red;
  }
</style>
<script>
  let progressbar = require('../export/progressbar.vue')
  module.exports = {
    components: {progressbar},
    data () {
      return {
        error: null,
        percent: 0,
        icon: '../../images/off-logo-lettered.svg',
        status: null,
        updator: null
      }
    },
    mounted () {
      let onError =  (err) => {
        this.error = err
      }
      let onCheckingForUpdate = () => {
        this.status = 'Checking for update'
      }
      let onUpdateAvailable = (info) => {
        console.log(info)
        this.status = 'Update Found'
      }
      let onDownloadProgress = (info) => {
        this.percent = info.percent
      }
      let onUpdateNotAvailable = () =>{
        this.status = 'Everything Up To Date'
        this.percent = 100
      }
      let onUpdatedDownloaded = (info) => {
        this.percent = 100
        this.status = 'Update Completed....Restarting'
      }
      this.updator = new Updator(ipcRenderer, onError, onCheckingForUpdate, onUpdateAvailable, onUpdateNotAvailable, onDownloadProgress, onUpdatedDownloaded)
    }
  }
</script>
