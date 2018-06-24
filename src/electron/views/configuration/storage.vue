<template>
  <div>
    <div class="columns">
      <div class="column"></div>
      <div class="column">
        <form @submit.prevent="save">
          <div class="field">
            <label class="label">Block Cache Storage Size(MB)</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-validate="{ required: true, numeric: true, max_value:1000000 , min_value: 300 }" v-model="blockCacheSize" name="blockCacheSize">
              <span class="icon is-small is-left">
                <i class="fa fa-hdd-o" aria-hidden="true"></i>
              </span>
            </div>
          </div>
          <span v-show="errors.has('blockCacheSize')" class="error">{{ errors.first('blockCacheSize') }}</span>
          <div class="field">
            <label class="label">Mini Block Cache Storage Size(MB)</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-model="miniBlockCacheSize" v-validate="{ required: true, numeric: true, max_value:1000000 , min_value: 300 }"  name="miniBlockCacheSize">
              <span class="icon is-small is-left">
                <i class="fa fa-hdd-o" aria-hidden="true"></i>
              </span>
            </div>
          </div>
          <span v-show="errors.has('miniBlockCacheSize')" class="error">{{ errors.first('miniBlockCacheSize') }}</span>
          <div class="field">
            <label class="label">Nano Block Cache Storage Size(MB)</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-model="nanoBlockCacheSize" v-validate="{ required: true, numeric: true, max_value:1000000 , min_value: 300 }" name="nanoBlockCacheSize">
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
    </div>
  </div>
</template>
<style>
</style>
<script>
  const mb = 1000000
  export default {
    mounted () {
      this.configurator = new Configurator(ipcRenderer, (err) => {
       this.error = err
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
      }
    },
    methods: {
      async save () {
        this.success = null
        let ok = await this.$validator.validateAll()
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
        this.success = 'Saved'
      }
    }
  }
</script>
