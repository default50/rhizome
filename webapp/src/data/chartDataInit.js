import _ from 'lodash'
import moment from 'moment'
import d3 from 'd3'

import builderDefinitions from 'stores/chartBuilder/builderDefinitions'
import processChartData from 'stores/chartBuilder/processChartData'

import api from 'data/api'
import treeify from 'data/transform/treeify'
import ancestryString from 'data/transform/ancestryString'

export default {
  prepareData (chartDef) {
    let data = {}

    return Promise.all([api.locations(), api.campaign(), api.office(), api.indicatorsTree()])
      .then(([locations, campaigns, offices, indicators]) => {
        let locationIndex = _.indexBy(locations.objects, 'id')
        data.locationList = _(locations.objects)
          .map(location => {
            return {
              'title': location.name,
              'value': location.id,
              'parent': location.parent_location_id
            }
          })
          .sortBy('title')
          .reverse()
          .thru(_.curryRight(treeify)('value'))
          .map(ancestryString)
          .value()

        data.location = chartDef.locationValue && locationIndex[chartDef.locationValue]
          ? locationIndex[chartDef.locationValue]
          : locationIndex[data.locationList[0].value]

        let locationLevelValue = _.findIndex(builderDefinitions.locationLevels, { value: chartDef.locations })
        data.locationSelected = builderDefinitions.locationLevels[locationLevelValue].getAggregated(data.location, locationIndex)

        let indicatorIndex = _.indexBy(indicators.flat, 'id')
        data.indicatorSelected = chartDef.indicators.map(id => {
          return indicatorIndex[id]
        })

        let officeIndex = _.indexBy(offices.objects, 'id')
        let campaignList = _(campaigns.objects)
          .map(campaign => {
            return _.assign({}, campaign, {
              'start_date': moment(campaign.start_date, 'YYYY-MM-DD').toDate(),
              'end_date': moment(campaign.end_date, 'YYYY-MM-DD').toDate(),
              'office': officeIndex[campaign.office_id]
            })
          })
          .sortBy(_.method('start_date.getTime'))
          .reverse()
          .value()

        let campaignIndex = _.indexBy(campaignList, 'id')

        data.campaign = chartDef.campaignValue && campaignIndex[chartDef.campaignValue]
          ? campaignIndex[chartDef.campaignValue]
          : campaignList[0]

        if (!data.indicatorSelected.length) {
          return
        }

        return this.fetchChart(chartDef, data, indicatorIndex)
      })
  },

  fetchChart (chartDef, data, indicatorIndex) {
    let locationIndex = _.indexBy(data.locationSelected, 'id')
    let groups = chartDef.groupBy === 'indicator' ? indicatorIndex : locationIndex

    let start = moment(data.campaign.start_date)
    let lower = builderDefinitions.times[_.findIndex(builderDefinitions.times, { json: chartDef.timeRange })].getLower(start)
    let upper = start.clone().startOf('month')

    let query = {
      indicator__in: _.map(data.indicatorSelected, _.property('id')),
      location__in: _.map(data.locationSelected, _.property('id')),
      campaign_start: (lower ? lower.format('YYYY-MM-DD') : null),
      campaign_end: upper.format('YYYY-MM-DD')
    }

    return processChartData.init(api.datapoints(query, null, { 'cache-control': 'no-cache' }),
      chartDef.type,
      data.indicatorSelected,
      data.locationSelected,
      lower,
      upper,
      groups,
      chartDef.groupBy,
      chartDef.x,
      chartDef.y
    ).then(chart => {
      let newOptions = _.clone(chart.options)
      if (!chart.options.yFormat) {
        newOptions.yFormat = d3.format(chartDef.yFormat)
      }
      if (!chart.options.xFormat) {
        newOptions.xFormat = d3.format(chartDef.xFormat)
      }
      return { data: chart.data, options: newOptions }
    })
  }
}
