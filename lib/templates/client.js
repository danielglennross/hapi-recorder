'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const AppComponent = require('./app.jsx');

const app = React.createFactory(AppComponent);
const mountNode = document.getElementById('app-mount');
const serverState = window.state;

ReactDOM.render(app(serverState), mountNode);
