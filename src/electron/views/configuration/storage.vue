<template>
  <div>
    <div class="columns">
      <div class="column"></div>
      <div class="column main">
        <form @submit.prevent="save">
          <label class="label">Cache Location</label>
          <div class="field has-addons">
            <div class="control">
              <input class="input path" disabled name="location" type="text" placeholder="Select a Cache Location" v-model="cacheLocation">
            </div>
            <div class="control">
              <a class="button is-info" @click="choose">
                Choose
              </a>
            </div>
          </div>
          <div class="field">
            <label class="label">Block Cache Storage Size(MB)</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-validate="{ required: true, numeric: true, max_value: 549755813, min_value: 300 }" v-model="blockCacheSize" name="blockCacheSize">
              <span class="icon is-small is-left">
                <i class="fa fa-hdd-o" aria-hidden="true"></i>
              </span>
            </div>
          </div>
          <span v-show="errors.has('blockCacheSize')" class="error">{{ errors.first('blockCacheSize') }}</span>
          <div class="field">
            <label class="label">Mini Block Cache Storage Size(MB)</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-model="miniBlockCacheSize" v-validate="{ required: true, numeric: true, max_value: 42949672, min_value: 300 }"  name="miniBlockCacheSize">
              <span class="icon is-small is-left">
                <i class="fa fa-hdd-o" aria-hidden="true"></i>
              </span>
            </div>
          </div>
          <span v-show="errors.has('miniBlockCacheSize')" class="error">{{ errors.first('miniBlockCacheSize') }}</span>
          <div class="field">
            <label class="label">Nano Block Cache Storage Size(MB)</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-model="nanoBlockCacheSize" v-validate="{ required: true, numeric: true, max_value: 584115, min_value: 300 }" name="nanoBlockCacheSize">
              <span class="icon is-small is-left">
                <i class="fa fa-hdd-o" aria-hidden="true"></i>
              </span>
            </div>
          </div>
          <span v-show="errors.has('nanoBlockCacheSize')" class="error">{{ errors.first('nanoBlockCacheSize') }}</span>
          <div class="control">
            <span class="message is-sucess" v-if="success">{{success}}</span>
            <span class="message is-danger" v-if="error">{{error}}</span>
            <input type="submit" class="button is-primary" style="float:right" value="Save">
          </div>
        </form>
      </div>
      <div class="column"></div>
      <div ref="restartModal" class="modal">
        <div class="modal-background"></div>
        <div class="modal-content">
          <div class="notification is-rounded has-text-centered">
            <h1 id="title" class="title">
              A node restart is required.
            </h1>
            <a class="button is-danger" @click="modalNo">No</a>
            <a class="button is-success" @click="modalYes">Yes</a>
          </div>
        </div>
        <div class="modal-close" @click="modalNo"></div>
      </div>
    </div>
  </div>
</template>
<style>
  .path {
   width: 500px;
  }
</style>
<script>
  const mb = 1000000
  module.exports = {
    mounted () {
      this.configurator = new Configurator(ipcRenderer, (err) => {
       this.error = err
      })
      this.configurator.get('cacheLocation')
        .then((location) => {
          this.cacheLocation = location
        })
      this.configurator.get('blockCacheSize')
        .then((size) => {
          this.blockCacheSize = size / mb
        })
      this.configurator.get('miniBlockCacheSize')
        .then((size) => {
          this.miniBlockCacheSize = size / mb
        })
      this.configurator.get('nanoBlockCacheSize')
        .then((size) => {
          this.nanoBlockCacheSize = size / mb
        })
    },
    data () {
      return {
        blockCacheSize: 0,
        miniBlockCacheSize: 0,
        nanoBlockCacheSize: 0,
        error: null,
        configurator: null,
        success: null,
        cacheLocation: null,
        dirty: false,
        yes: null,
        no: null
      }
    },
    methods: {
      choose () {
        dialog.showOpenDialog({properties: [ 'openDirectory' ]}, (filePaths) => {
         if (Array.isArray(filePaths)) {
           this.cacheLocation = filePaths[0]
           this.dirty = true;
         }
        })
      },
      toggleModal () {
        this.$refs.restartModal.classList.toggle('is-active')
      },
      modalYes () {
        this.yes()
      },
      modalNo () {
        this.toggleModal()
        this.no()
      },
      async save () {
        this.success = null
        let ok = await this.$validator.validateAll()
        if (!ok) {
          return
        }
        if (this.dirty) {
          await new Promise((resolve, reject) => {
            this.yes = resolve
            this.no = reject
            this.toggleModal()
          })
        }
        ok = await this.configurator.set('cacheLocation', this.cacheLocation)
        if (!ok) {
          return
        }
        ok = await this.configurator.set('blockCacheSize', (this.blockCacheSize * mb))
        if (!ok) {
          return
        }
        ok = await this.configurator.set('miniBlockCacheSize', (this.miniBlockCacheSize * mb))
        if (!ok) {
          return
        }
        ok = await this.configurator.set('nanoBlockCacheSize', (this.nanoBlockCacheSize * mb))
        if (!ok) {
          return
        }
        if (this.dirty) {
          await this.configurator.restart()
        }
        this.success = 'Saved'
      }
    }
  }
</script>
