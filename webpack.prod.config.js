var webpack = require('webpack')
var BundleTracker = require('webpack-bundle-tracker')
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var config = require('./webpack.config.js');

config.output.path = require('path').resolve('./assets/dist')

const TerserPlugin = require('terser-webpack-plugin');

config.plugins = config.plugins.concat([
  new BundleTracker({filename: './webpack-stats-prod.json'}),

  // removes a lot of debugging code in React
  new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': JSON.stringify('production')
  }}),

  // keeps hashes consistent between compilations
  new webpack.optimize.OccurrenceOrderPlugin(),

  // minifies your code

  /*new webpack.optimize.UglifyJsPlugin({
    compressor: {
      warnings: false
    }
  })*/
])

config.optimization = {
   minimize: true,
   minimizer: [new TerserPlugin()],
 },

module.exports = config;

/*
config.plugins = [
    new ExtractTextPlugin('tworavens_styles.css'),
    new BundleTracker({filename: './webpack-stats-prod.json'})
]
*/
