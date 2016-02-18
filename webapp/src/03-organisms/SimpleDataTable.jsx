import api from 'data/api'
import _ from 'lodash'
import React from 'react'
import Reflux from 'reflux'
import cx from 'classnames'
import d3 from 'd3'

import InterfaceMixin from '00-utilities/tech_debt/InterfaceMixin'
import EditableTableCell from '01-atoms/EditableTableCell.jsx'
import TableHeaderCell from '01-atoms/TableHeaderCell.jsx'
import SimpleDataTableColumn from '02-molecules/tables/SimpleDataTableColumn'

import EditableTableCellStore from 'stores/EditableTableCellStore'
import SimpleDataTableActions from 'actions/SimpleDataTableActions'

let SimpleDataTable = React.createClass({

  mixins: [
    InterfaceMixin('Datascope', 'DatascopeSort'), Reflux.connect(EditableTableCellStore, 'editedCell')
  ],

  propTypes: {
    data: React.PropTypes.array,                    // data displayed on the table, from Datascope
    schema: React.PropTypes.object,                 // data schema, from Datascope
    fields: React.PropTypes.object,                 // fields (display rules)
    query: React.PropTypes.object,                  // query (search, sort, filter)
    sortable: React.PropTypes.bool,                 // if true, can sort table by clicking header
    sortOrder: React.PropTypes.string,              // order for the sort ('ascending' or 'descending')
    onChangeSort: React.PropTypes.func,             // callback to call when user changes sort, passed implicitly by Datascope
    emptyContent: React.PropTypes.node,             // if null, table will hide on no data // content to show in the table if there is no data
    isEmptyContentInTable: React.PropTypes.bool,    // if true, puts emptyContent inside the tbody, otherwise shown instead of the table
    sortIndicatorAscending: React.PropTypes.string, // sort up and down arrows
    sortKey: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]), // key for the column on which the data is sorted (eg. 'age')
    orderedFields: React.PropTypes.array,
    sortIndicatorDescending: React.PropTypes.string,
    children: React.PropTypes.array
  },

  getDefaultProps: function () {
    return {
      sortable: true,
      emptyContent: <div className="ds-data-table-empty">No results found</div>,
      isEmptyContentInTable: false,
      sortIndicatorAscending: ' ▲',
      sortIndicatorDescending: ' ▼'
    }
  },

  _withResponse: function (error) {
      if (error.msg && error.msg.message) { window.alert('Error: ' + error.msg.message) }
      console.log(error)
      this.hasError = true
    },

  _withError: function (error) {
    if (error.msg && error.msg.message) { window.alert('Error: ' + error.msg.message) }
    console.log(error)
    this.hasError = true
  },

  _numberFormatter: function (v) {
    return (isNaN(v) || _.isNull(v)) ? v : d3.format('n')(v)
  },

  sortColumns: function (dataKey) {
    let isSortedOnColumn = dataKey === this.props.sortKey
    let isSortAscending = (this.props.sortOrder || '').toLowerCase().indexOf('asc') === 0
    // if not already sorted by this, sort descending by this
    // if already sorted descending by this, sort ascending
    // if already sorted ascending by this, remove sort
    let sortKey = !isSortedOnColumn || !isSortAscending ? dataKey : undefined
    let sortOrder = !isSortedOnColumn ? 'descending' : !isSortAscending ? 'ascending' : undefined
    this.props.onChangeSort(sortKey, sortOrder)
  },

  renderRow: function (columns, row) {
    let table_cells = React.Children.map(columns, column => {
      return <EditableTableCell key={column.props.name}
              value={row[column.props.name]}
              validateValue={SimpleDataTableActions.validateCellValue}
              onSave={SimpleDataTableActions.updateCell}
              formatValue={this._numberFormatter}
              tooltip={column.props.name + 'BROW!'}
              classes={'numeric'} />
    })
    return <tr>{ table_cells }</tr>
  },

  renderColumnHeader: function (column) {
    let propsToPass = _.assign({}, _.clone(column.props), { // todo _.omit or _.pick
      onClick: this.props.sortable ? this.sortColumns.bind(this, column.props.name) : null,
      field: this.props.fields[column.props.name],
      schema: this.props.schema.items.properties[column.props.name],
      isSortedBy: column.props.name === this.props.sortKey,
      sortOrder: this.props.sortOrder,
      sortIndicatorAscending: this.props.sortIndicatorAscending,
      sortIndicatorDescending: this.props.sortIndicatorDescending
    })
    return React.createElement(TableHeaderCell, propsToPass)
  },

  render: function () {
    console.log('this.state render', this.state)
    // if no data, and no "empty" message to show, hide table entirely
    let hasData = this.props.data && this.props.data.length
    if (!hasData && _.isNull(this.props.emptyContent)) return null

    let hasColumns = false
    let columns = React.Children.map(this.props.children, function (child) {
      let isColumn = _.isFunction(child.type.implementsInterface) && child.type.implementsInterface('DataTableColumn')
      if (isColumn) hasColumns = true
      return isColumn ? child : null
    })
    if (!hasColumns) {
      columns = _.map(this.props.orderedFields, function (field) {
        return React.createElement(SimpleDataTableColumn, { name: field.key })
      })
    }

    let children = this.props.children
    children = _.isUndefined(children) ? [] : _.isArray(children) ? children : [children]

    let renderRow = _.partial(this.renderRow, columns)

    if (hasData || this.props.isEmptyContentInTable) {
      return (
        <table className={cx(['ds-data-table', { 'ds-data-table-sortable': this.props.sortable }])}>
          <thead>
            <tr>
              { React.Children.map(columns, this.renderColumnHeader) }
            </tr>
          </thead>
          <tbody>
            { hasData ? this.props.data.map(renderRow) : this.props.emptyContent}
          </tbody>
        </table>
      )
    } else {
      return this.props.emptyContent
    }
  }
})

export default  SimpleDataTable
