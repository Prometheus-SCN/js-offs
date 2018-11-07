<template>
  <form class="form" @submit.prevent="connect" style="overflow:hidden;">
    <div class="column">
      <div class="field">
        <label class="label">Locator</label>
        <div class="control has-icons-left has-icons-right">
          <input v-model="locator" class=" input is-success" type="text" placeholder="locator"  name="locator">
          <span class="icon is-small is-left">
            <i class="fa fa-globe"></i>
          </span>
        </div>
        <p v-show="locatorErr"  class="help is-danger">Invalid Locator</p>
      </div>
      <div class="control">
        <span class="message is-sucess" v-if="success">Success</span>
        <span class="message is-danger" v-if="connectErr">{{connectErr}}</span>
        <input type="submit" class="button is-primary" :disabled="connecting" style="float:right" value="Connect">
      </div>
    </div>
  </form>
</template>
<style scoped>
  .form {
    padding: 0 20px 0 20px;
  }
</style>
<script>
  module.exports = {
    data () {
      return {
        locatorErr: false,
        locator: null,
        locatorRegEx: new RegExp(/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)/),
        connector: null,
        connectErr: null,
        success: false,
        connecting: false
      }
    },
    mounted () {
      this.connector = new Connector(ipcRenderer, (err) => {
        this.connectErr = err
      })
    },
    methods: {
      async connect() {
        this.connectErr= null
        this.locatorErr = !this.locatorRegEx.test(this.locator)
        if (this.locatorErr) {
          return
        }
        try {
          this.connecting= true
          this.success = await this.connector.connect(this.locator)
          this.connecting= false
        } catch (ex) {
          this.connectErr = ex
          this.connecting= false
        }
      }
    }
  }
</script>
