<template lang="pug">
  div.form-group
    label(v-if="label",for="dp") {{ label }}
    dp(name="dp",:placeholder="placeholder || 'Click here to select date...'",format="MMMM dd, yyyy",:bootstrap-styling="true",v-model="date",:value="value",@selected="dateChanged")
</template>

<script>
  import moment from 'moment'
  import DatePicker from 'vuejs-datepicker'

  export default {
    props: [ 'valueKey', 'label', 'placeholder', 'value' ],
    data() {
      return {
        date: null
      }
    },
    methods: {
      dateChanged(date) {
        const sanitizedDate = moment.utc(date || this.date).startOf('day').toDate()
        this.$emit('input', sanitizedDate)
        this.$emit('changedWithKey', sanitizedDate, this.valueKey)
      }
    },
    mounted() {
      if (this.value)
        this.date = moment(this.value).toDate()
    },
    components: {
      dp: DatePicker
    }
  }
</script>
