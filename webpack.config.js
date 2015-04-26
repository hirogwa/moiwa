module.exports = {
    entry: "./src/static/js/main.js",
    output: {
        path: __dirname + '/src/static/js',
        filename: "bundle.js"
    },
    module: {
        loaders: [{
            test: /\.html$/,
            loader: 'underscore-template-loader'
        }]
    }
};
