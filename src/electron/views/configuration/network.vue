<template>
  <div>
    <div class="columns">
      <div class="column"></div>
      <div class="column">
        <form @submit.prevent="save">
          <div class="field">
            <label class="label">Start Port</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" v-validate="{ required: true, numeric: true, max_value:65535, min_value: 1024 }" type="text" v-model="startPort" name="startPort">
              <span class="icon is-small is-left">
                #
              </span>
            </div>
          </div>
          <span v-show="errors.has('startPort')" class="error">{{ errors.first('startPort') }}</span>
          <div class="field">
            <label class="label">Port Retries</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-model="numPortTries" v-validate="{ required: true, numeric: true, min_value: 0 }"  name="numPortTries">
              <span class="icon is-small is-left">
                #
              </span>
            </div>
          </div>
          <span v-show="errors.has('numPortTries')" class="error">{{ errors.first('numPortTries') }}</span>
          <div class="field">
            <label class="label">HTTP Port</label>
            <div class="control has-icons-left has-icons-right">
              <input class="input is-success" type="text" v-validate="{ required: true, numeric: true, max_value:65535, min_value: 1024 }" v-model="httpPort" name="httpPort">
              <span class="icon is-small is-left">
                #
              </span>
            </div>
          </div>
          <span v-show="errors.has('httpPort')" class="error">{{ errors.first('httpPort') }}</span>
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
  export default {
    mounted () {
      this.configurator = new Configurator(ipcRenderer, (err) => {
       this.error = err
      })
      this.configurator.get('startPort')
        .then((port) => {
          this.startPort = port
        })
      this.configurator.get('numPortTries')
        .then((retry) => {
          this.portRetries = retry
        })
      this.configurator.get('httpPort')
        .then((port) => {
          this.httpPort = port
        })
    },
    data () {
      return {
        startPort: 0,
        httpPort: 0,
        numPortTries: 0,
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
        ok = await this.configurator.set('startPort', this.startPort)
        if (!ok) {
          return
        }
        ok = await this.configurator.set('numPortTries', this.numPortTries)
        if (!ok) {
          return
        }
        ok = await this.configurator.set('httpPort', this.httpPort)
        if (!ok) {
          return
        }
        this.success = 'Saved'
      }
    }
  }
</script>
