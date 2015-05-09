$(function() {
    var AppRouter = Backbone.Router.extend({
        routes: {
            '' : 'new',
            'new' : 'new',
            'list': 'list'
        },

        new: function() {
            var l = require('./views/log-entry.js');
            new l.LogEntryView();
        },

        list: function() {
            var l = require('./views/entry-list.js');
            new l.EntryListView();
        }
    });

    var router = new AppRouter();
    Backbone.history.start({pushState: true});
});
