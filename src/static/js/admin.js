$(function() {
    var AppRouter = Backbone.Router.extend({
        routes: {
            '' : 'newEntry',
            'new': 'newEntry'
        },

        newEntry: function() {
            console.log('newEntry');
            var l = require('./views/log-entry.js');
            new l.LogEntryView();
        }
    });

    var router = new AppRouter();
    Backbone.history.start({
        root: '/admin',
        pushState: true
    });
});
