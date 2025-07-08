Component({
  properties: {
    photo: { type: Object, value: {} }
  },
  data: {},
  methods: {
    onClick () {
      this.triggerEvent('click')
    }
  }
}) 