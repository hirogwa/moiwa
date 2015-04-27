var entryListViewTemplate = require('./entry-list-view.html');

var EntryListView = Backbone.View.extend({
    el: $('#view-container'),

    initialize: function() {
        _.bindAll(this, 'render', 'load');

        this.template = entryListViewTemplate;
        this.watchLogList = [];

        var self = this;
        this.load().then(
            function(result) {
                self.watchLogList = result;
                self.render();
            }, function(reason) {
                console.log(reason);
            });
    },

    render: function() {
        this.$el.html(this.template({
            watchLogs: this.watchLogList
        }));

        return this;
    },

    load: function() {
        return new Promise(function(resolve, reject) {
            $.ajax({
                url: '/watchlogs',
                data: {
                },
                dataType: 'json',
                success: function(data) {
                    resolve(data);
                },
                error: function(data) {
                    reject(data);
                }
            });
        });
    }
});

module.exports = {
    EntryListView: EntryListView
};
