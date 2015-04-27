var models = require('../models/models.js');
var collections = require('../collections/collections.js');

var imageViewTemplate = require('./image-view.html');
var ImageView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'render');
        this.template = imageViewTemplate;
        this.model.on('change', this.render);
    },

    render: function(model) {
        var attrSelected = 'selected';
        if (!model) {
            this.$el.html(this.template({image: this.model.toJSON()}));
            return this;
        }
        if (model.changedAttributes(attrSelected)) {
            if (this.model.get(attrSelected)) {
                this.$el.addClass(attrSelected);
            } else {
                this.$el.removeClass(attrSelected);
            }
        }
        return this;
    }
});

var imageListViewTemplate = require('./image-list-view.html');
var ImageListView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'render', 'renderAdd');
        this.template = imageListViewTemplate;
        this.collection.on('add', this.renderAdd);
        this.collection.on('reset', this.render);
    },

    render: function() {
        this.$el.html(this.template());
        this.collection.forEach(function(image) {
            this.renderAdd(image);
        }, this);
        return this;
    },

    renderAdd: function(image) {
        this.$('#images').append(new ImageView({
            model: image
        }).render().el);
        return this;
    }
});

var videoViewTemplate = require('./video-view.html');
var VideoView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'render');
        this.template = videoViewTemplate;
        this.model.on('change', this.render);
    },

    render: function(model) {
        // at instance creation
        if (!model) {
            return this;
        }

        // when selected/deselected
        var attrSelected = 'selected';
        if (model.changedAttributes(attrSelected)) {
            if (this.model.get(attrSelected)) {
                this.$el.addClass(attrSelected);
            } else {
                this.$el.removeClass(attrSelected);
            }
        }

        // when detail loaded
        if (model.changedAttributes('details')) {
            this.$el.html(this.template({model: this.model.toJSON()}));
        }

        return this;
    }
});

var videoListViewTemplate = require('./video-list-view.html');
var VideoListView = Backbone.View.extend({
    initialize: function(options) {
        _.bindAll(this, 'render', 'renderAdd');
        this.template = videoListViewTemplate;
        this.collection.on('add', this.renderAdd);
        this.collection.on('reset', this.render);
    },

    render: function() {
        this.$el.html(this.template());
        this.collection.forEach(function(v) {
            this.renderAdd(v);
        }, this);
        return this;
    },

    renderAdd: function(video) {
        this.$('#videos').append(new VideoView({
            model: video
        }).render().el);
        return this;
    }
});

module.exports = {
    ImageListView: ImageListView,
    VideoListView: VideoListView
};
