var Vue = require('vue')
var App = require('./configuration.vue')
var VueRouter = require('vue-router')
var router = require('./router')
Vue.use(VueRouter)

new Vue({
  el: '#app',
  router,
  render: function (createElement) {
    return createElement(App)
  }
})