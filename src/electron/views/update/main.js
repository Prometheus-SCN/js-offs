var Vue = require('vue')
var App = require('./update.vue')

new Vue({
  el: '#app',
  render: function (createElement) {
    return createElement(App)
  }
})