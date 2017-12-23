var Vue = require('vue')
var App = require('./connect.vue')

new Vue({
  el: '#app',
  render: function (createElement) {
    return createElement(App)
  }
})