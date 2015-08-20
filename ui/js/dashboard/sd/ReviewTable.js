var _ = require('lodash');
var React = require('react/addons');
var API = require('data/api');
var RegionTitleMenu     = require('component/RegionTitleMenu.jsx');
var IndicatorDropdownMenu = require('component/IndicatorDropdownMenu.jsx');
var CampaignDropdownMenu = require('component/CampaignDropdownMenu.jsx');

const {
	Datascope, LocalDatascope,
	SimpleDataTable, SimpleDataTableColumn,
	ClearQueryLink,
	Paginator,
	SearchBar,
	FilterPanel, FilterDateRange, FilterInputRadio
	} = require('react-datascope');

var parseSchema = require('ufadmin/utils/parseSchema');

var ReviewTable = React.createClass({
	propTypes: {
		title: React.PropTypes.string.isRequired,
		getMetadata: React.PropTypes.func.isRequired,
		getData: React.PropTypes.func.isRequired,
    loading   : React.PropTypes.bool.isRequired,
		region 		: React.PropTypes.object.isRequired,
	},
	getInitialState: function() {
		return {
			data: null,
			schema: null,
			query: {},
			loading   : false,
		}
	},

	componentWillMount: function() {
		this.props.getMetadata()
		.then(response => this.setState({
				schema: parseSchema(response)
		}));

		this.props.getData({master_object_id:this.props.region.id},null,{'cache-control':'no-cache'})
			.then(response => this.setState({
						data: response.objects
			}));
		},

	componentWillUpdate : function (nextProps, nextState) {
			if (nextProps.region != this.props.region) {
				console.log('updagint now new regions')
				return;
			}
			if (nextProps.getMetadata != this.props.getMetadata) {
				console.log('bring up a new tabl')
				return;
			}
		},

	componentWillReceiveProps: function(nextProps) {
		this.props.getMetadata()
		.then(response => this.setState({
				schema: parseSchema(response)
		}));

		this.props.getData({master_object_id:this.props.region.id},null,{'cache-control':'no-cache'})
			.then(response => this.setState({
						data: response.objects
			}));

		this.forceUpdate()
		},
	render() {


		var isLoaded = _.isArray(this.state.data) && this.state.schema && (!this.state.loading);
		if(!isLoaded) return this.renderLoading();

		var {data, schema} = this.state;

		return <div>
        <LocalDatascope data={data} schema={schema} pageSize={25}>
	         <Datascope>
	           {this.props.children}
	         </Datascope>
         </LocalDatascope>
		</div>
	},
	renderLoading() {
		return <div className='admin-loading'> Review Page Loading...</div>
	},
});


module.exports = ReviewTable;
