<template>
  <form @submit.prevent="connect">
    <div class="columns">
      <div class="column"></div>
      <div class="column">
        <div class="field">
          <label class="label">Node ID</label>
          <div class="control has-icons-left has-icons-right">
            <input class="input is-success" type="text" v-model="nodeid" name="nodeid">
            <span class="icon is-small is-left">
            <i class="fa fa-id-card-o"></i>
          </span>
          </div>
            <p v-show="nodeidErr"  class="help is-danger">Invalid Node ID</p>
        </div>
      </div>
      <div class="column">
        <div class="field">
          <label class="label">IP Address</label>
          <div class="control has-icons-left has-icons-right">
            <input class="input is-success" type="text" placeholder="0.0.0.0" v-model="ipaddress" name="ipaddress" >
            <span class="icon is-small is-left">
            <i class="fa fa-sitemap"></i>
          </span>
          </div>
          <p v-show="ipaddressErr"  class="help is-danger">Invalid IP Address</p>
        </div>
      </div>
      <div class="column">
        <div class="field">
          <label class="label">Port</label>
          <div class="control has-icons-left has-icons-right">
            <input v-model="port" class=" input is-success" type="text" placeholder="#"  name="port">
            <span class="icon is-small is-left">
            <i class="fa fa-space-shuttle"></i>
          </span>
          </div>
          <p v-show="portErr"  class="help is-danger">Invalid Port</p>
        </div>
        <div class="control">
          <input type="submit" class="button is-primary" style="float:right" value="Connect">
        </div>
      </div>
      <div class="column"></div>
    </div>

  </form>
</template>
<style>
</style>
<script>
  export default {
    data () {
      return {
        nodeidErr: false,
        ipaddressErr: false,
        portErr: false,
        nodeid: null,
        ipaddress: null,
        port: null,
        nodeIdRegEx: new RegExp(/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{43})/),
        ipRegEx: new RegExp(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
      }
    },
    methods: {
      connect() {
        this.nodeidErr = !this.nodeIdRegEx.test(this.nodeid)
        this.ipaddressErr = !this.ipRegEx.test(this.ipaddress)
        this.portErr = (!Number.isInteger(+this.port)) || (this.port < 1) || (this.port > 65535)
        console.log((Number.isInteger( +this.port)),  (this.port < 1), (this.port > 65535) )
        if (this.nodeidErr || this.portErr || this.portErr) {
          return
        }
      }
    }
  }
</script>
