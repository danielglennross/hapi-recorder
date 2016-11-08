'use strict';

const React = require('react');

const HeaderRow = require('./headerRow.jsx');
const GraphRow = require('./graphRow.jsx');

class Row extends React.Component {

  constructor() {
    super();
    this.state = { isActive: false };
  }

  toggleActive() {
    this.setState((prevState) => ({
      isActive: !prevState.isActive
    }));
  }

  render() {
    return (
      <div onClick={this.toggleActive.bind(this)}>
        <HeaderRow id={this.props.route.id} method={this.props.route.request.method} path={this.props.route.request.path}></HeaderRow>
        <GraphRow id={this.props.route.id} track={this.props.track} isRowActive={this.state.isActive}></GraphRow>
      </div>
    );
  }
}

module.exports = Row;
