'use strict';

var _ = require('lodash');
var d3 = require('d3');

var formats = {
	percent: d3.format('%')
};

var scales = {
	completionColor: d3.scale.quantize().domain([0, 1]).range(['#FC5959', '#fc8d59', '#ffffbf', '#d9ef8b', '#91cf60'])
}

module.exports = {
	template: require('./template.html'),

	ready: function () {
		
		_.defaults(this.$data, {
			groupSize: 5
		});

		this.$watch('rows', function() {
			this.updateStats();
		}, true);

	},

	methods: {

		// update table stats
		updateStats: function() {
			var self = this;

			var newCounter = function() {
				return {
					'complete': 0,
					'total': 0
				};
			};

			var stats = {
				total: newCounter(),
				byRow: [],
				byColumn: []
			};

			if (self.rows.length > 0) {

				_.forEach(self.rows, function(row, rowIndex) {

					if (stats.byRow[rowIndex] === undefined) {
						stats.byRow[rowIndex] = newCounter();
					}

					_.forEach(row, function(cell, colIndex) {

						if (stats.byColumn[colIndex] === undefined) {
							stats.byColumn[colIndex] = newCounter();
						}

						if (cell.isEditable) {

							stats.total.total ++;
							stats.byRow[rowIndex].total ++;
							stats.byColumn[colIndex].total ++;

							if (!_.isNull(cell.value)) {
								stats.total.complete ++;
								stats.byRow[rowIndex].complete ++;
								stats.byColumn[colIndex].complete ++;
							}

						}

					}); // end column loop

				}); // end row loop

			}

			self.$set('stats', stats);

		}
		
	},

	filters: {

		percent: function(v) {
			return formats.percent(v);
		},

		completionColor: function(v) {
			return scales.completionColor(v);
		}

	},

	components: {
		'uf-cell': require('./cell')
	}
};
