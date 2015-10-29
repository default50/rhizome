import Reflux from 'reflux'
import _ from 'lodash'
import moment from 'moment'
import d3 from 'd3'

import ChartWizardActions from 'actions/ChartWizardActions'
import api from 'data/api'
import processChartData from 'stores/chartBuilder/processChartData'
import chartDefinitions from 'stores/chartBuilder/chartDefinitions'
import treeify from 'data/transform/treeify'
import ancestryString from 'data/transform/ancestryString'

let ChartWizardStore = Reflux.createStore({
  listenables: ChartWizardActions,
  data: {
    indicatorList: [],
    indicatorSelected: [],
    locationList: [],
    locationSelected: null,
    campaignFilteredList: [],
    timeRangeFilteredList: [],
    groupByValue: 0,
    timeValue: 0,
    yFormatValue: 0,
    canDisplayChart: false,
    chartDef: {}
  },

  filterCampaignByLocation(campaigns, location) {
    return campaigns.filter(campaign => {
      return campaign.office.name == location.name
    })
  },

  filterTimeRangeByChartType(timeRanges, chartType) {
    let expectTimes = _.find(chartDefinitions.charts, {name: chartType}).timeRadios
    return timeRanges.filter(time => {
      return _.includes(expectTimes, time.value)
    })
  },

  applyChartDef(chartDef) {
    this.data.groupByValue = _.findIndex(chartDefinitions.groups, {value: chartDef.groupBy})
    this.data.timeValue = Math.max(_.findIndex(this.data.timeRangeFilteredList, {json: chartDef.timeRange}), 0)
    this.data.yFormatValue = _.findIndex(chartDefinitions.formats, {value: chartDef.yFormat})
  },

  integrateChartOption(chartOption) {
    if (!chartOption.yFormat) {
      chartOption.yFormat = d3.format(chartDefinitions.formats[this.data.yFormatValue].value)
    }
    return chartOption
  },

  getInitialState() {
    return this.data
  },

  onInitialize(chartDef, location, campaign) {
    this.data.chartDef = _.clone(chartDef)
    this.data.location = location
    this.data.campaign = campaign

    Promise.all([api.indicatorsTree(), api.locations(), api.campaign(), api.office()]).
      then(([indicators, locations, campaigns, offices]) => {
        this.indicatorIndex = _.indexBy(indicators.flat, 'id')
        this.data.indicatorList = _.sortBy(indicators.objects, 'title')
        this.data.indicatorSelected = chartDef.indicators.map(id => {
          return this.indicatorIndex[id]
        })

        this.locationIndex = _.indexBy(locations.objects, 'id')
        this.data.locationList = _(locations.objects)
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

        let officeIndex = _.indexBy(offices.objects, 'id')
        this.campaignList = _(campaigns.objects)
          .map(campaign => {
            return _.assign({}, campaign, {
              'start_date': moment(campaign.start_date, 'YYYY-MM-DD').toDate(),
              'end_date': moment(campaign.end_date, 'YYYY-MM-DD').toDate(),
              'office': officeIndex[campaign.office_id]
            });
          })
          .sortBy(_.method('start_date.getTime'))
          .reverse()
          .value()

        this.campaignIndex = _.indexBy(this.campaignList, 'id')

        this.data.campaignFilteredList = this.filterCampaignByLocation(this.campaignList, this.data.location)
        this.data.timeRangeFilteredList = this.filterTimeRangeByChartType(chartDefinitions.times, this.data.chartDef.type)
        this.applyChartDef(chartDef)

        this.previewChart()
    })
  },

  onEditTitle(value) {
    this.data.chartDef.title = value
    this.trigger(this.data)
  },

  onAddLocation(index) {
    this.data.location = this.locationIndex[index]
    this.data.campaignFilteredList = this.filterCampaignByLocation(this.campaignList, this.data.location)
    this.previewChart()
  },

  onAddIndicator(index) {
    this.data.indicatorSelected.push(this.indicatorIndex[index])
    this.previewChart()
  },

  onRemoveIndicator(id) {
    _.remove(this.data.indicatorSelected, {id: id})
    this.previewChart()
  },

  onAddCampaign(index) {
    this.data.campaign = this.campaignIndex[index]
    this.previewChart()
  },

  onChangeChart(value) {
    this.data.chartDef.type = value
    this.data.timeRangeFilteredList = this.filterTimeRangeByChartType(chartDefinitions.times, this.data.chartDef.type)
    this.data.chartData = []
    this.previewChart()
  },

  onChangeGroupRadio(value) {
    this.data.groupByValue = value
    this.previewChart()
  },

  onChangeTimeRadio(value) {
    this.data.timeValue = value
    this.previewChart()
  },

  onChangeYFormatRadio(value) {
    this.data.yFormatValue = value
    this.previewChart()
  },

  onSaveChart(callback) {
    callback(_.merge(this.data.chartDef, {
      indicators: this.data.indicatorSelected.map(item => {
        return item.id
      }),
      groupBy: chartDefinitions.groups[this.data.groupByValue].value,
      timeRange: this.data.timeRangeFilteredList[this.data.timeValue].json,
      yFormat: chartDefinitions.formats[this.data.yFormatValue].value
    }, (a, b) => {
      return b
    }))
  },

  previewChart() {
    if (!this.data.indicatorSelected.length) {
      this.data.canDisplayChart = false
      this.trigger(this.data)
      return
    }
    let chartType = this.data.chartDef.type
    let groupBy = chartDefinitions.groups[this.data.groupByValue].value
    let indicatorIndex = _.indexBy(this.data.indicatorSelected, 'id')
    let locationIndex = _.indexBy([this.data.location], 'id')
    let groups = this.data.groupByValue == 0 ? indicatorIndex : locationIndex
    let start = moment(this.data.campaign.start_date)
    let lower = chartDefinitions.times[this.data.timeValue].getLower(start)
    let upper = start.clone().startOf('month')
    let indicatorArray = _.map(this.data.indicatorSelected, _.property('id'))
    let query = {
      indicator__in: indicatorArray,
      location__in: _.map([this.data.location], _.property('id')),
      campaign_start: (lower ? lower.format('YYYY-MM-DD') : null),
      campaign_end: upper.format('YYYY-MM-DD')
    }

    processChartData.init(api.datapoints(query),
      chartType,
      this.data.chartDef.indicatorsSelected,
      [this.data.location],
      lower,
      upper,
      groups,
      groupBy,
      this.data.chartDef.x,
      this.data.chartDef.y)
    .then(chart => {
      if (!chart.options || !chart.data) {
        this.data.canDisplayChart = false
      } else {
        this.data.canDisplayChart = true
        this.data.chartOptions = this.integrateChartOption(chart.options)
        this.data.chartData = chart.data
      }
      this.trigger(this.data)
    });
  }
})

export default ChartWizardStore