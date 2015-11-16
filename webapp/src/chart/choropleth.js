'use strict'

import _ from 'lodash'
import d3 from 'd3'
import React from 'react'
import Layer from 'react-layer'

import Tooltip from 'component/Tooltip.jsx'

import browser from 'util/browser'

import legend from 'chart/renderer/legend'

var DEFAULTS = {
  aspect: 1,
  domain: _.noop,
  margin: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  onClick: _.noop,
  value: _.property('properties.value'),
  yFormat: d => d3.format(Math.abs(d) < 1 ? '.4f' : 'n')(d),
  name: _.property('properties.name')
}

function _calculateBounds (features) {
  var lat = _.property(1)
  var lng = _.property(0)

  if (features.length < 1) {
    return [[0, 0], [0, 0]]
  }

  var coordinates = _(features).map(function (f) {
    if (f.geometry.type !== 'MultiPolygon') {
      return _.flatten(f.geometry.coordinates)
    }
  })
    .flatten()
    .value()

  var left = d3.min(coordinates, lng)
  var right = d3.max(coordinates, lng)
  var bottom = d3.min(coordinates, lat)
  var top = d3.max(coordinates, lat)

  return [[left, top], [right, bottom]]
}

function _calculateCenter (bounds) {
  var lat = bounds[1][1] + ((bounds[0][1] - bounds[1][1]) / 2)
  var lng = bounds[0][0] + ((bounds[1][0] - bounds[0][0]) / 2)

  return [lng, lat]
}

function ChoroplethMap () {
}

_.extend(ChoroplethMap.prototype, {
  defaults: DEFAULTS,

  initialize: function (el, data, options) {
    options = this._options = _.defaults({}, options, DEFAULTS)

    var margin = options.margin

    var aspect = _.get(options, 'aspect', 1)
    this._width = _.get(options, 'width', el.clientWidth)
    this._height = _.get(options, 'height', this._width * aspect)

    var svg = this._svg = d3.select(el).append('svg')
      .attr('class', 'reds')
      .attr('viewBox', '0 0 ' + this._width + ' ' + this._height)

    if (browser.isIE()) {
      svg.attr({
        'width': this._width,
        'height': this._height
      })
    }

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')

    g.append('g').attr('class', 'data')
    g.append('g').attr('class', 'legend')
    svg.append('g').attr('class', 'bubbles')
    svg.select('.bubbles').append('g').attr('class', 'data')
    svg.select('.bubbles').append('g').attr('class', 'legend')

    svg.append('g').attr('class', 'stripes')
    svg.select('.stripes').append('g').attr('class', 'data')
    svg.select('.stripes').append('g').attr('class', 'legend')

    var lineWidth = 10
    var lineHeight = 10
    var lineInterval = 5

    var defs = svg.append('defs')

    var pattern = defs.append('pattern')
      .attr({
        'id': 'stripe',
        'patternUnits': 'userSpaceOnUse',
        'width': lineWidth,
        'height': lineHeight
      })

    pattern.append('line')
      .attr({
        'x1': 0,
        'y1': 0,
        'x2': -lineInterval,
        'y2': lineHeight
      })

    pattern.append('line')
      .attr({
        'x1': lineInterval,
        'y1': 0,
        'x2': 0,
        'y2': lineHeight
      })

    pattern.append('line')
      .attr({
        'x1': 2 * lineInterval,
        'y1': 0,
        'x2': lineInterval,
        'y2': lineHeight
      })

    pattern.selectAll('line')
      .attr({
        'stroke-linecap': 'square',
        'stroke-linejoin': 'miter',
        'stroke-width': 1
      })

    this.update(data)
  },

  update: function (data, options) {
    options = _.assign(this._options, options)

    var margin = options.margin
    var w = this._width - margin.left - margin.right
    var h = this._height - margin.top - margin.bottom

    var svg = this._svg
    var g = svg.select('.data')

    var features = _.reject(data, 'properties.isBorder')

    var bounds = _calculateBounds(features)
    var center = _calculateCenter(bounds)

    var projection = d3.geo.conicEqualArea()
      .parallels([bounds[1][1], bounds[0][1]])
      .rotate([-center[0], 0])   // Rotate the globe so that the country is centered horizontally
      .center([0, center[1]])    // Set the center of the projection so that the polygon is moved vertically into the center of the viewport
      .translate([w / 2, h / 2]) // Translate to the center of the viewport
      .scale(1)

    var b = [projection(bounds[0]), projection(bounds[1])]
    var s = 1 / Math.max((b[1][0] - b[0][0]) / w, (b[1][1] - b[0][1]) / h)

    projection.scale(s)

    var path = d3.geo.path().projection(projection)

    var domain = options.domain(features)

    if (!_.isArray(domain)) {
      domain = d3.extent(features, options.value)
      domain[0] = Math.min(domain[0], 0)
    }

    var colorScale = d3.scale.quantize()
      .domain(domain)
      .range([
        '#FEE7DC',
        '#FABAA2',
        '#F58667',
        '#D95449',
        '#AF373E',
        '#2D2525'
      ])

    var location = g.selectAll('.location')
      .data(features, function (d, i) {
        return _.get(d, 'properties.location_id', i)
      })

    location.enter().append('path')

    location.attr({
      'd': path,
      'class': function (d) {
        var v = options.value(d)
        var classNames = ['location']

        if (_.isFinite(v)) {
          classNames.push('clickable')
        }

        return classNames.join(' ')
      }
    })
      .style('fill', function (d) {
        var v = options.value(d)
        return _.isFinite(v) ? colorScale(v) : '#fff'
      })
      .on('click', function (d) {
        options.onClick(_.get(d, 'properties.location_id'))
      })
      .on('mousemove', _.partial(this._onMouseMove, _, options))
      .on('mouseout', this._onMouseOut)

    location.exit().remove()

    var ticks = _.map(
      colorScale.range(),
        c => _.map(colorScale.invertExtent(c), options.yFormat).join('—')
    )

    if (_.every(colorScale.domain(), _.isNaN)) {
      svg.select('.legend').selectAll('*').remove()
    } else {
      svg.select('.legend')
        .call(legend().scale(
          d3.scale.ordinal().domain(ticks).range(colorScale.range())
        )
      ).attr('transform', function () {
        return 'translate(' + w + ', ' + 0 + ')'
      })
    }

    if (!_.isUndefined(options.bubblesValue)) {
      var bubbles = svg.selectAll('.bubbles').select('.data')
      var bubbleData = bubbles.selectAll('circle')
        .data(features, function (d, i) {
          return _.get(d, 'properties.location_id', i)
        })

      bubbleData.enter().append('circle')
      bubbleData.attr('transform', function (d) {
        return 'translate(' + path.centroid(d) + ')'
      })
        .attr('r', function (d) {
          var v = options.bubblesValue(d)
          return v ? options.radius(v) : 0
        })
        .style({
          'opacity': 0.5,
          'fill': '#D5EBF7',
          'stroke': '#FFFFFF'
        })

      bubbleData.exit().remove()

      var bubbleLegendText = [100, 1000, 5000]
      var bubbleLegend = svg.select('.bubbles').select('.legend')
        .attr('transform', function () {
          return 'translate(' + (w + 80) + ', ' + 300 + ')'
        })
        .selectAll('.series').data(bubbleLegendText)
        .enter().append('g')
        .attr('class', 'series')

      bubbleLegend.append('circle')
        .attr('r', function(d) {return options.radius(d)})
        .style({
          'opacity': 0.5,
          'fill': 'transparent',
          'stroke': '#AAAAAA'
        })

      bubbleLegend.append('text')
        .attr('transform', function (d, i) {
          return 'translate(' + 19 + ', ' + i * 15 + ')'
        })
        .text(function(d) {return d})
    }

    if (!_.isUndefined(options.stripesValue)) {
      var stripes = svg.select('.stripes').select('.data')
      var stripeData = stripes.selectAll('.location')
        .data(features, function (d, i) {
          return _.get(d, 'properties.location_id', i)
        })

      stripeData.enter().append('path')

      stripeData.attr({
        'd': path,
        'class': 'location'
      })
        .style('fill', function (d) {
          var v = options.stripesValue(d)
          var lineColor = _.isFinite(options.value(d)) ? '#ffffff' : '#cccccc'
          svg.selectAll('line').style('stroke', lineColor)
          return _.isFinite(v) ? 'url(#stripe)' : '#fff'
        })
        .style('opacity', function (d) {
          var v = options.stripesValue(d)
          return _.isFinite(v) ? 1 : 0
        })

      stripeData.exit().remove()

      var stripeLegendColor = d3.scale.ordinal().range(['#FFFFFF', 'url(#stripe)'])
      var stripeLegendText = ['No data collected', 'Access challenged area']
      var stripeLegend = svg.select('.stripes').select('.legend')
        .attr('transform', function () {
          return 'translate(' + w + ', ' + 50 + ')'
        })
        .selectAll('.series').data(stripeLegendText)
        .enter().append('g')
        .attr('class', 'series')
        .attr('transform', function (d, i) {
          return 'translate(' + 19 + ', ' + i * 15 + ')'
        })

      stripeLegend.append('rect')
        .attr('width', 9)
        .attr('height', 9)
        .style({
          'fill': stripeLegendColor,
          'stroke': '#cccccc',
          'stroke-width': 1
        })

      stripeLegend.append('text')
        .attr({
          'x': 15,
          'y': 3.5,
          'dy': '0.4em'
        })
        .style('text-anchor', 'start')
        .text(function (d) {
          return d
        })
    }
  },

  _onMouseMove: function (d, options) {
    var evt = d3.event

    var render = function () {
      return React.createElement(
        Tooltip,
        {left: evt.pageX + 2, top: evt.pageY + 2},
        options.name(d)
      )
    }

    if (this.layer) {
      this.layer._render = render
    } else {
      this.layer = new Layer(document.body, render)
    }

    this.layer.render()
  },

  _onMouseOut: function () {
    if (this.layer) {
      this.layer.destroy()
      this.layer = null
    }
  }
})

export default ChoroplethMap
