<template>
  <div>
    <div ref="fileStatus">
      <div class="file-status">
        <div class="icontainer">
          <img :class="error ? 'loader-icon error' : 'loader-icon'" :src="icon">
        </div>
        <div>
          {{status}}
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
    background-color: #e1eaf1;
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
  .file-status {
    width: 100%;
    height: 100%;
    display: grid;
    grid-gap: 0;
    margin: 5px;
    align-items: center;
    justify-items: center;
  }
  .error {
    color: red;
  }
  .rate {
    justify-self: end;
  }
  .total {
    justify-self: start;
  }
</style>
<script>
  let progressbar = require('../export/progressbar.vue')
  function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  module.exports = {
    components: {progressbar},
    data () {
      return {
        error: null,
        percent: 0,
        icon: '../../images/off-logo-lettered.svg',
        status: null,
        updator: null,
        transferred: 0,
        total: 0,
        rate: 0
      }
    },
    mounted () {
      let onError =  (err) => {
        this.error = err
        this.status = err
      }
      let onCheckingForUpdate = () => {
        this.status = 'Checking for update'
      }
      let onUpdateAvailable = (info) => {
        this.status = 'Update Found...Downloading'
        this.icon = `../../images/Preloader_${ getRandomInt(1, 7) }.gif`
      }
      let onDownloadProgress = (info) => {
        this.percent = info.percent
        this.transferred = info.transferred
        this.total = info.total
        this.rate = info.bytesPerSecond
      }
      let onUpdateNotAvailable = () =>{
        this.status = 'Everything Up To Date'
        this.percent = 100
      }
      let onUpdatedDownloaded = (info) => {
        this.icon = '../../images/off-logo-lettered.svg'
        this.percent = 100
        this.status = 'Update Completed....Restarting'
      }
      this.updator = new Updator(ipcRenderer, onError, onCheckingForUpdate, onUpdateAvailable, onUpdateNotAvailable, onDownloadProgress, onUpdatedDownloaded)
    }
  }
</script>
