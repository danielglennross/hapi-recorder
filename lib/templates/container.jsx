'use strict';

const React = require('react');

const Row = require('./row.jsx');

class Container extends React.Component {

  renderItem(r) {
    return (
      <Row key={r.route.id} route={r.route} track={r.track}></Row>
    );
  }

  render() {
    return (
      <div className='container'>
        {
          this.props.data.map(r => this.renderItem(r))
        }
      </div>
    );
  }
}

module.exports = Container;
