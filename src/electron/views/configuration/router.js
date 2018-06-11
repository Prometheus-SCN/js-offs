var VueRouter = require('vue-router')
var Bootstrap = require('./bootstrap.vue')
module.exports = new VueRouter({
  routes: [
    {
      path: '/',
      name: 'Boostrap',
      redirect: '/bootstrap'
    },
    {
      path: '/bootstrap',
      name: 'Boostrap',
      component: Bootstrap
    }
  ]
})