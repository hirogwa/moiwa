$(function() {
    var AppRouter = Backbone.Router.extend({
        routes: {
            '' : 'list',
            'list': 'list'
        },

        list: function() {
            var l = require('./views/entry-list.js');
            new l.EntryListView();
        }
    });

    var router = new AppRouter();
    Backbone.history.start({pushState: true});
});
