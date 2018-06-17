var Vue = require('vue')
var App = require('./configuration.vue')
var VueRouter = require('vue-router')
var router = require('./router')
var VeeValidate = require('vee-validate')
Vue.use(VeeValidate)
Vue.use(VueRouter)

new Vue({
  el: '#app',
  router,
  render: function (createElement) {
    return createElement(App)
  }
})