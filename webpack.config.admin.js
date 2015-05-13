module.exports = {
    entry: "./src/static/js/admin.js",
    output: {
        path: __dirname + '/src/static/js',
        filename: "admin-bundle.js"
    },
    module: {
        loaders: [{
            test: /\.html$/,
            loader: 'underscore-template-loader'
        }]
    }
};
