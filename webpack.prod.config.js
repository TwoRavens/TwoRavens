var webpack = require('webpack')
var BundleTracker = require('webpack-bundle-tracker')

var config = require('./webpack.config.js');

config.output.path = require('path').resolve('./assets/dist')

const TerserPlugin = require('terser-webpack-plugin');

config.plugins = config.plugins.concat([
    new BundleTracker({filename: './webpack-stats-prod.json'}),

    // keeps hashes consistent between compilations
    new webpack.optimize.OccurrenceOrderPlugin(),
])

config.optimization = {
    minimize: true,
    minimizer: [new TerserPlugin()],
}

module.exports = config;

/*
config.plugins = [
    new ExtractTextPlugin('tworavens_styles.css'),
    new BundleTracker({filename: './webpack-stats-prod.json'})
]
*/
