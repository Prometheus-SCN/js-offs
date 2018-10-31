<template>
  <div>
    <div class="columns">
      <div class="column"></div>
        <div class="column main">
          <table class="table is-bordered is-striped is-narrow is-hoverable is-fullwidth" v-if="peers.length">
            <thead>
              <tr>
                <td>Node ID</td>
                <td>IP Address</td>
                <td>Port</td>
                <td>Remove</td>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(peer, index) in peers">
                  <td>{{peer.id}}</td>
                  <td>{{peer.ip}}</td>
                  <td>{{peer.port}}</td>
                  <td><i class="fa fa-times-circle" aria-hidden="true" @click="remove(index)"></i></td>
              </tr>
            </tbody>
          </table>
          <div>
            <label class="checkbox">
              <input type="checkbox" v-model="lastKnownPeers">
              Bootstrap To Last Known Connections
            </label>
          </div>
          <hr>
          <form @submit.prevent="add">
            <div class="columns">
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
                  <span class="message is-sucess" v-if="success">Success</span>
                  <span class="message is-danger" v-if="configuratorErr">{{configuratorErr}}</span>
                  <input type="submit" class="button is-primary" style="float:right" value="Add">
                </div>
              </div>
            </div>
          </form>
        </div>
      <div class="column"></div>
    </div>
  </div>
</template>
<style scoped>
  .main {
    min-width: 800px;
  }
</style>
<script>
  export default {
    mounted () {
      this.configurator = new Configurator(ipcRenderer, (err) => {
       this.configuratorErr = err
      })
      this.configurator.get('bootstrap')
        .then((peers) => {
          this.peers = peers
        })
      this.configurator.get('lastKnownPeers').then((lastKnownPeers) => this.lastKnownPeers = lastKnownPeers)
    },
    data () {
      return {
        configurator: null,
        peers: [],
        nodeidErr: false,
        ipaddressErr: false,
        portErr: false,
        nodeid: null,
        ipaddress: null,
        port: null,
        nodeIdRegEx: new RegExp(/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{43})/),
        ipRegEx: new RegExp(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/),
        connector: null,
        configuratorErr: null,
        success: false,
        lastKnownPeers: null
      }
    },
    methods: {
      resize () {
        var w = window.innerHeight, d = window.document.offsetHeight, b = document.getElementByQuerySelector('body').offsetHeight
        window.resizeBy(0, ((b - w) || d - w))
      },
      add () {
        this.connectErr= null
        this.nodeidErr = !this.nodeIdRegEx.test(this.nodeid)
        this.ipaddressErr = !this.ipRegEx.test(this.ipaddress)
        this.portErr = (!Number.isInteger(+this.port)) || (this.port < 1) || (this.port > 65535)
        if (this.nodeidErr || this.portErr || this.portErr) {
          return
        }
        if (this.peers.find((peer) => peer.id === this.nodeid)) {
          this.configuratorErr = "Peer already exists"
          return
        }
        this.peers.push({id: this.nodeid, ip: this.ipaddress, port: +this.port})
        this.configurator.set('bootstrap', this.peers). then((success) => {
          if (success) {
            this.configuratorErr = null
            this.configurator.get('bootstrap')
              .then((peers) => {
                this.peers = peers
              })
          }
        })
        this.configurator.set('lastKnownPeers', this.lastKnownPeers).then((success) => this.configuratorErr = null)
      },
      remove (index) {
        this.peers.splice(index, 1)
        this.configurator.set('bootstrap', this.peers).then((success) => {
          if (success) {
            this.configuratorErr = null
            this.configurator.get('bootstrap')
              .then((peers) => {
                this.peers = peers
              })
          }
        })
      }
    }
  }
</script>
