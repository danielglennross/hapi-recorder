'use strict';

const React = require('react');

class HeaderRow extends React.Component {

  render() {
    return (
      <div className='row'>
        <div className='col-md-12 header'>
          <span>{this.props.id}</span>
          <span>[{this.props.method}] {this.props.path}</span>
        </div>
      </div>
    );
  }
}

module.exports = HeaderRow;
