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
              Bootstrap to last known connections?
              <input type="checkbox" v-model="lastKnownPeers" @click="check">
            </label>
          </div>
          <hr>
          <form @submit.prevent="add">
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
                <span class="message is-danger" v-if="configuratorErr">{{configuratorErr}}</span>
                <input type="submit" class="button is-primary" style="float:right" value="Add">
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
        locatorErr: false,
        locator: null,
        locatorRegEx: new RegExp(/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+)/),
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
        this.locatorErr = !this.locatorRegEx.test(this.locator)
        if (this.locatorErrr) {
          return
        }
        try {
          let newPeer = Peer.fromLocator(this.locator)
          if (this.peers.find((peer) => peer.id === newPeer.key)) {
            this.configuratorErr = "Peer already exists"
            return
          }
          this.peers.push({id: newPeer.key, ip: newPeer.ip, port: newPeer.port})
          this.configurator.set('bootstrap', this.peers). then((success) => {
            if (success) {
              this.configuratorErr = null
              this.configurator.get('bootstrap')
                .then((peers) => {
                  this.peers = peers
                })
            }
          })
        } catch(ex) {
          this.configuratorErr = 'Invalid Locator'
        }
      },
      check () {
        this.configurator.set('lastKnownPeers', this.lastKnownPeers).then((success) => { if (success) { this.configuratorErr = null } })
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
