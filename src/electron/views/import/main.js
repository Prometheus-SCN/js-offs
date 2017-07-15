var Vue = require('vue')
var App = require('./import.vue')

new Vue({
  el: '#app',
  render: function (createElement) {
    return createElement(App)
  }
})