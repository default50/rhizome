'use strict';

var Reflux = require('reflux');
var api = require('data/api');
var _      = require('lodash');

var SimpleFormActions = require('actions/SimpleFormActions');

var SimpleFormStore = Reflux.createStore({
  data: {
    indicatorId: null,
    indicatorObject: null,
    loading: true,
    saving: false
  },

  listenables: [ SimpleFormActions ],

  getInitialState: function(){
    return this.data;
  },

  onInitialize: function(indicator_id) {
    var self = this;
    self.data.indicatorId = indicator_id;

    // updating existing group? need to get more data
    if (self.data.indicatorId) {
      Promise.all([
          api.indicators({ id: self.data.indicatorId }, null, { 'cache-control': 'no-cache' }),
          api.indicator_to_tag({ indicator_id: self.data.indicatorId }, null, { 'cache-control': 'no-cache' }),
          api.indicator_calculation({ indicator_id: self.data.indicatorId }, null, { 'cache-control': 'no-cache' }),
        ])
        .then(_.spread(function(indicators, indicator_to_tag_list, indicator_calc_list) {

          self.data.indicatorObject = indicators.objects[0];
          self.data.indicatorTagList = indicator_to_tag_list.objects;
          self.data.indicatorCalcList = indicator_calc_list.objects;

          self.data.loading = false;
          self.trigger(self.data);
        }));

    }
    // creating new indicator
    else {
      self.data.loading = false;
      self.trigger(self.data);
      }
    },

	// addTagToIndicator: function(data){
  //   var self = this;
  //   api.set_indicator_to_tag( {indicator_id:this.$parent.$data.indicator_id, indicator_tag_id:data }).then(function(){
  //     self.loadIndicatorTag();
  //   });
  // },
  // deleteTagFromIndicator: function(data){
  //   var self = this;
  //   api.set_indicator_to_tag( {indicator_id:this.$parent.$data.indicator_id, indicator_tag_id:data,id:'' }).then(function(){
  //     self.loadIndicatorTag();
  //   });
  // },

  // onGetTagForIndicator: function(indicator_id) {
  //   var self = this;
  //
  //   Promise.all([api.indicator_to_tag({ indicator_id: 164 })])
  //     .then(_.spread(function(response) {
  //       var indicatorTags = response.objects
  //
  //       self.data.rowData = indicatorTags;
  //       self.data.loading = false;
  //       self.trigger(self.data);
  //
  //     }));
  //   },

});

module.exports = SimpleFormStore;
