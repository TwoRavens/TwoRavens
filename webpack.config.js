var path = require('path');
var webpack = require('webpack');   // for django-webpack
var BundleTracker = require('webpack-bundle-tracker');     // for django-webpack

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    context: __dirname,
    entry: './assets/app/index.js',
    output: {
        path: path.resolve(__dirname, 'assets', 'build'),
        filename: 'tworavens_app-[hash].js'
    },
    devtool: 'eval-source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.css$/,
                use: [
                    {loader: MiniCssExtractPlugin.loader},
                    'css-loader',
                ],
            },
            {
                test: /\.png$/,
                use: [{
                    loader: 'file-loader',
                    options: {}
                }]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'tworavens_styles-[hash].css',
        }),
        new BundleTracker({filename: './webpack-stats.json'})
    ]
};
