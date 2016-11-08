'use strict';

const React = require('react');

const Container = require('./container.jsx');

class App extends React.Component {

  render() {
    return (
      <Container data={this.props.data} />
    );
  }
}

module.exports = App;
