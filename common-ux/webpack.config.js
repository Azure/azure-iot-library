"use strict";
let path = require('path');
let webpack = require('webpack');

module.exports = {
    context: __dirname + '/',
    entry: './unpacked.js',
    devtool: 'source-map',
    output: {
        path: __dirname + '/',
        filename: 'client.js',
        sourceMapFilename: 'client.js.map'
    },
    module: {
        preLoaders: [
            { test: /\.js$/, loader: "source-map-loader" }
        ],
        loaders: [
            { test: /\.html$/, loaders: ['raw'] },
            { test: /\.scss$/, loaders: ['raw', 'sass'] }
        ]
    },
    sassLoader: {
        includePaths: [path.resolve(__dirname, "./theme")]
    }
};