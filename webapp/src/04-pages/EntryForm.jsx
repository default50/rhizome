import _ from 'lodash'
import React from 'react'
import Reflux from 'reflux'

import DropdownMenu from '02-molecules/menus/DropdownMenu'
import DatabrowserTable from '02-molecules/DatabrowserTable'
import List from '02-molecules/list/List'

import EntryFormStore from 'stores/EntryFormStore'
import EntryFormActions from 'actions/EntryFormActions'

let EntryForm = React.createClass({
  mixins: [Reflux.connect(EntryFormStore)],

  componentWillMount: function () {
    EntryFormActions.initData()
  },

  refresh: function () {
    if (!this.state.couldLoad) return
    EntryFormActions.getTableData()
  },

  render () {
    let formIdSelected = this.state.formIdSelected
    let formName = 'Select a Form'
    let indicatorSelected = []
    if (formIdSelected) {
      let formDef = _.find(this.state.entryFormDefinitions,
        function (d) { return d.form_id.toString() === formIdSelected })
      formName = formDef.title
      formDef.indicator_id_list.forEach(indicator_id => {
        indicatorSelected.push(this.state.indicatorMap[indicator_id])
      })
    }

    let formDropDown = (
      <div>
        <label htmlFor='forms'>Forms</label>
        <DropdownMenu
          items={this.state.entryFormDefinitions}
          sendValue={EntryFormActions.setForm}
          item_plural_name='Forms'
          text={formName}/>
      </div>
    )

    let campaignIdSelected = this.state.campaignIdSelected
    let campaignName = 'Select a Campaign'
    if (campaignIdSelected) {
      var campaignObj = _.find(this.state.campaigns,
        function (c) { return c.id.toString() === campaignIdSelected })
    }

    if (campaignObj) {
      campaignName = campaignObj.name
    }

    let campaignDropdown = (
      <div>
        <label htmlFor='campaigns'>Campaigns</label>
        <DropdownMenu
          items={this.state.campaigns}
          sendValue={EntryFormActions.setCampaign}
          item_plural_name='Campaign'
          text={campaignName}
          title_field='name'
          value_field='id'
          icon='fa-globe'
          uniqueOnly/>
      </div>
    )

    let locationDropDown = (
      <div>
        <label htmlFor='locations'>Locations</label>
        <DropdownMenu
          items={this.state.filterLocations}
          sendValue={EntryFormActions.addLocations}
          item_plural_name='Locations'
          text='Select Locations'
          icon='fa-globe'
          uniqueOnly/>
        <List items={this.state.locationSelected} removeItem={EntryFormActions.removeLocation} />
      </div>
    )

    let includeSublocations = (
      <div>
        <br />
        <label className={this.state.couldLoad ? '' : 'disabled'}>
          <input type='checkbox'
            checked={this.state.includeSublocations && this.state.couldLoad}
            onClick={EntryFormActions.changeSelect} />Include Sublocations
        </label>
      </div>
    )

    let loadEntryForm = (
      <div>
        <br />
        <a role='button'
          onClick={this.refresh}
          className={this.state.couldLoad ? 'button success' : 'button success disabled'} >
          <i className='fa fa-fw fa-refresh' />Load Entry Form
        </a>
      </div>
    )

    return (
      <div className='row'>
        <form>
          <div className='medium-2 columns'>
            {formDropDown}
            {campaignDropdown}
            {locationDropDown}
            {includeSublocations}
            {loadEntryForm}
          </div>
        </form>
        <div className='medium-10 columns'>
          <DatabrowserTable
            data={this.state.apiResponseData}
            selected_locations={this.state.locationSelected}
            selected_indicators={indicatorSelected}
        />
        </div>
      </div>
    )
  }
})

export default EntryForm
