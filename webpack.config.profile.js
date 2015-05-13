module.exports = {
    entry: "./src/static/js/profile.js",
    output: {
        path: __dirname + '/src/static/js',
        filename: "profile-bundle.js"
    },
    module: {
        loaders: [{
            test: /\.html$/,
            loader: 'underscore-template-loader'
        }]
    }
};
