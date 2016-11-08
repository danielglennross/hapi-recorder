'use strict';

const Path = require('path');

module.exports = {
  entry: Path.join(__dirname, './lib/templates/client.js'),
  resolve: {
    extensions: ['', '.js', '.jsx']
  },
  output: {
    filename: Path.join(__dirname, './lib/templates/assets/client.js')
  },
  watch: true,
  module: {
    loaders: [{
      test: /\.jsx$/,
      loader: 'babel-loader',
      query: {
        presets: ['react', 'es2015']
      }
    }]
  }
};
