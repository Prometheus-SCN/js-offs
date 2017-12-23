var Vue = require('vue')
var App = require('./configuration.vue')

new Vue({
  el: '#app',
  render: function (createElement) {
    return createElement(App)
  }
})