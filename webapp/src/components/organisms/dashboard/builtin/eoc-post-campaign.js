export default {
  'id': -11,
  'title': 'EOC Post Campaign',
  'dashboardType': 'EocCampaign',
  'builtin': true,
  'charts': [
    {
      'title': 'tableData',
      'type': 'TableChart',
      // 'locations': 'sublocations',
      'indicators': [28, 34, 21, 31, 33, 32, 30, 15],
      'groupBy': 'indicator',
      'timeRange': {
        months: 0
      }
      // 'yFormat': ',.0f',
      // 'xFormat': ',.0f'
    }, {
      'title': 'trendData',
      'type': 'LineChart',
      'indicators': [21],
      'timeRange': {
        months: 12
      }
    }, {
      'title': 'mapData',
      'type': 'ChoroplethMap',
      'locations': 'sublocations',
      'timeRange': 0,
      'indicators': [21] // Percent missed children outside sample
    }
  ]
}
