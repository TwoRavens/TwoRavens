var path = require('path');
var webpack = require('webpack');   // for django-webpack
var BundleTracker = require('webpack-bundle-tracker');     // for django-webpack

var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    context: __dirname,
    entry: './assets/app/index.js',
    output: {
        path: path.resolve(__dirname, 'assets', 'build'),
        filename: 'tworavens_app-[hash].js'
    },
    devtool: 'eval-source-map',
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            options: {
                presets: ['es2015']
            }
          }, {
            test: /\.css$/,
            use: ExtractTextPlugin.extract({use: 'css-loader'}), 
          }, {
            test: /\.png$/,
            use: [{
                loader: 'file-loader',
                options: {}
            }]
          }
        ] 
    },
    plugins: [
        new ExtractTextPlugin('tworavens_styles-[hash].css'),
        new BundleTracker({filename: './webpack-stats.json'})
    ]
};
