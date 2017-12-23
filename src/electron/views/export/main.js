var Vue = require('vue')
var App = require('./export.vue')
var VeeValidate = require('vee-validate')

const config = {
  errorBagName: 'errors', // change if property conflicts
  fieldsBagName: 'fields',
  delay: 0,
  locale: 'en',
  dictionary: null,
  strict: true,
  classes: false,
  classNames: {
    touched: 'touched', // the control has been blurred
    untouched: 'untouched', // the control hasn't been blurred
    valid: 'valid', // model is valid
    invalid: 'invalid', // model is invalid
    pristine: 'pristine', // control has not been interacted with
    dirty: 'dirty' // control has been interacted with
  },
  events: 'input',
  inject: true,
  validity: false,
  aria: true
}

Vue.use(VeeValidate, config)
new Vue({
  el: '#app',
  render: function (createElement) {
    return createElement(App)
  }
})