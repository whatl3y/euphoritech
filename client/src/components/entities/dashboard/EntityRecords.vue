<template lang="pug">
  b-col
    div.d-flex.justify-content-between
      h1 {{ type.name }}
      div.align-self-start(v-if="isRealType()")
        a(href="javascript:void(0)",@click="$store.commit('TOGGLE_CREATE_ENTITY_MODAL', type_id)")
          small Create New {{ type.name }}
    hr(v-if="isRealType()")
    div.entity-wrapper
      h5.accordion-header(v-if="isRealType()")
        a(href="javascript:void(0)",@click="changeActiveAccordion('overview')")
          i.fa(:class="($store.state.session.entities.dashboard.accordion.visibility.overview) ? 'fa-angle-down' : 'fa-angle-right'")
          span.margin-left-medium Overview
      b-collapse#entity-overview(:visible="isRealType()",v-model="$store.state.session.entities.dashboard.accordion.visibility.overview",accordion="entity-accordion",role="tabpanel")
        b-card-body
          div this is the overview body....
      h5.accordion-header
        a(href="javascript:void(0)",@click="changeActiveAccordion('records')")
          i.fa(:class="($store.state.session.entities.dashboard.accordion.visibility.records) ? 'fa-angle-down' : 'fa-angle-right'")
          span.margin-left-medium Records List
      b-collapse#entity-records(v-model="$store.state.session.entities.dashboard.accordion.visibility.records",accordion="entity-accordion",role="tabpanel")
        b-card-body
          b-form.margin-bottom-medium(@submit="searchForRecords")
            b-form-input(v-model="searchTerm",placeholder="Search for records...")
          b-alert.text-center(:show="data.data.length === 0",variant="warning")
            div.text-large
              span There are no records of type: {{ type.name }}.&nbsp;
              a(v-if="isRealType()",href="javascript:void(0)",@click.prevent="toggleCreateEntityModal") Click Here
              span(v-if="isRealType()")  to add one.
          div(v-if="data.data.length > 0")
            table.table.thin
              thead
                tr
                  th #
                  th Name
                  th Description
                  th Source
                  th Unique ID
                  th Due Date
                  th(v-if="!isRealType()") Restore
              tbody
                tr(v-for="(record, ind) in recordsSorted")
                  td
                    span {{ (ind + 1) + ((data.currentPage - 1) * perPage) }}.
                    a.cog.margin-left-small(v-if="isRealType()",:id="'edit-record-' + ind",href="javascript:void(0)")
                      i.fa.fa-cog
                    b-popover(ref="edit-popover",:target="'edit-record-' + ind",title="Edit")
                      div
                        strong {{ truncateString(record.name, 20) }}
                      hr(style="margin-top: 5px; margin-bottom: 5px;")
                      div Change record type:
                      b-form-select(size="sm",:options="typeOptions",v-model="currentTypeId",@change.native="changeEntityTypeOrRemove(record.id, ind)")
                      div.all-small-inputs Due Date
                        datepicker(v-model="record.due_date",@input="changeDueDate(record.due_date, record.id)")
                      div.margin-top-medium.text-center
                        a.text-danger(href="javascript:void(0)",@click="deleteEntity(record.id, ind)") Delete Record
                  td.nowrap-ellipses.max-150.strong-text(:id="'record-name-' + ind")
                    strong
                      a.entity-link(:href="'/dashboard/entity/' + record.id") {{ record.name }}
                    b-tooltip(:target="'record-name-' + ind") {{ record.name }}
                  td.nowrap-ellipses.max-250(:id="'record-desc-' + ind") {{ record.description }}
                    b-tooltip(:target="'record-desc-' + ind") {{ truncateString(record.description, 400) }}
                  td {{ record.source }}
                  td {{ record.uid }}
                  td {{ (record.due_date) ? getFormattedDate(record.due_date) : 'N/A' }}
                  td(v-if="!isRealType()")
                    a(href="javascript:void(0)",@click="restoreEntity(record.id, ind)") Restore Record
            div(v-if="numberOfPages > 1")
              hr
              b-pagination(size="sm",align="right",:total-rows="data.totalCount",v-model="data.currentPage",:per-page="perPage",@change="changePage")
</template>

<script>
  import StringHelpers from '../../../factories/StringHelpers'
  import TimeHelpers from '../../../factories/TimeHelpers'
  import ApiAuth from '../../../factories/ApiAuth'
  import ApiEntities from '../../../factories/ApiEntities'
  import SnackbarFactory from '../../../factories/SnackbarFactory'

  export default {
    props: {
      data: { type: Object },
      type_id: { type: [ Number, String ] }
    },

    data() {
      return {
        type: {},
        currentTypeId: null,
        typeOptions: [],
        searchTerm: null
      }
    },

    computed: {
      recordsSorted() {
        return this.data.data.sort((r1, r2) => {
          return (r1.name.toLowerCase() < r2.name.toLowerCase()) ? -1 : 1
        })
      },

      perPage() {
        return (this.data.numberPages <= 1) ? this.data.totalCount : Math.ceil(this.data.totalCount / this.data.numberPages)
      },

      numberOfPages() {
        return (this.data.totalCount > this.perPage)
          ? Math.ceil(this.data.totalCount / this.perPage)
          : 1
      }
    },

    methods: {
      getFormattedDate: TimeHelpers.getFormattedDate,
      truncateString: StringHelpers.truncateString,

      async searchForRecords($event) {
        $event.preventDefault()
        this.$emit('searchForRecords', this.searchTerm)
      },

      changePage(newPage) {
        this.$emit('changePage', this.searchTerm, newPage)
      },

      getAccordionSessionObj() {
        return this.$store.state.session.entities.dashboard.accordion.visibility
      },

      async changeActiveAccordion(key) {
        const obj = this.getAccordionSessionObj()
        obj[key] = !obj[key]

        const newSessionObj = { dashboard: { accordion: { visibility: {}}}}
        newSessionObj.dashboard.accordion.visibility = Object.keys(obj).reduce((o, k) => {
          if (k === key) {
            o[k] = true
          } else {
            o[k] = false
          }
          return o
        }, {})

        await ApiAuth.setSession('entities', newSessionObj)
      },

      newlineToBr(str) {
        return str.replace('\n', '<br>')
      },

      async changeDueDate(dueDate, entityId) {
        const toast = SnackbarFactory(this)
        await ApiEntities.updateEntity({ id: entityId, due_date: dueDate })
        toast.open("Successfully set due date!")
      },

      async deleteEntity(entityId, ind) {
        const toast = SnackbarFactory(this)
        await ApiEntities.deleteEntity(entityId)
        this.closeEntityEditPopover(ind)
        this.$emit('changeEntityTypeOrRemove', entityId)
        toast.open("Successfully deleted record!")
      },

      async restoreEntity(entityId, ind) {
        const toast = SnackbarFactory(this)
        await ApiEntities.updateEntity({ id: entityId, status: 'active' })
        this.closeEntityEditPopover(ind)
        this.$emit('changeEntityTypeOrRemove', entityId)
        toast.open("Successfully restored record!")
      },

      changeEntityTypeOrRemove(entityId, ind) {
        // TODO: remove after the following issue is fixed:
        // https://github.com/bootstrap-vue/bootstrap-vue/issues/1772
        setTimeout(async () => {
          await ApiEntities.updateEntity({ id: entityId, entity_type_id: this.currentTypeId })
          this.closeEntityEditPopover(ind)
          this.currentTypeId = this.type_id
          this.$emit('changeEntityTypeOrRemove', entityId)
        }, 100)
      },

      isRealType() {
        return !isNaN(parseInt(this.type_id))
      },

      toggleCreateEntityModal() {
        this.$store.commit('TOGGLE_CREATE_ENTITY_MODAL', this.type_id)
      },

      closeEntityEditPopover(ind) {
        this.$refs['edit-popover'][ind].$emit('close')
      }
    },

    created() {
      if (this.type_id === 'deleted') {
        this.type = { name: 'Deleted' }
        this.currentTypeId = this.type_id
        this.$store.state.session.entities.dashboard.accordion.visibility = {
          overview: false,
          records: true
        }
      } else {
        this.type = this.$store.state.session.current_team_types.find(t => parseInt(t.id) === parseInt(this.type_id)) || {}
        this.currentTypeId = parseInt(this.type_id)
      }

      this.typeOptions = this.$store.state.session.current_team_types
        .filter(f => !!f.is_active)
        .sort((t1, t2) => (t1.name.toLowerCase() > t2.name.toLowerCase()) ? 1 : -1)
        .map(f => ({ text: f.name, value: f.id }))
    }
  }
</script>

<style scoped lang="scss">
  td {
    vertical-align: middle;
  }

  a.cog {
    color: inherit;
  }

  .accordion-header {
    margin: 0px;
  }

  .entity-wrapper {
    .accordion-header:not(:first-child) {
      border-top: 1px solid rgba(0, 0, 0, 0.125);
      margin-top: 10px;
      padding-top: 20px;
    }

    a.entity-link {
      color: inherit;
      text-decoration: underline;
    }
  }
</style>
