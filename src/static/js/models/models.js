var Artwork = Backbone.Model;

var Image = Backbone.Model;

var WatchLog = Backbone.Model.extend({
    defaults: {
        title: "",
        poster: new Image(),
        backdrop: new Image(),
        video_id: '',
        date: new Date().toISOString().slice(0, 10)
    },

    url: '/watchlog',
});

var Video = Backbone.Model.extend({
    initialize: function(options) {
        _.bindAll(this, 'getDetails');
        if (!options.details) {
            this.getDetails();
        }
    },

    getDetails: function() {
        this.details = {};
        var self = this;
        $.ajax({
            url: '/video',
            data: {
                id: self.get('id')
            },
            success: function(data) {
                data.publishedAt = new Date(
                    Date.parse(data.snippet.publishedAt)).toDateString();
                data.viewCount = parseInt(
                    data.statistics.viewCount, '10').toLocaleString();
                data.likeCount = parseInt(
                    data.statistics.likeCount, '10').toLocaleString();
                data.dislikeCount = parseInt(
                    data.statistics.dislikeCount, '10').toLocaleString();
                self.set({'details': data});
            },
            failure: function(data) {
                console.log('Video getDetails failure');
            }
        });
    }
});

module.exports = {
    Artwork: Artwork,
    Image: Image,
    WatchLog: WatchLog,
    Video: Video
};
