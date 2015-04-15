$(function() {
    var WatchLog = Backbone.Model.extend({
        defaults: {
            title: "New Title...",
            poster_url: undefined
        },
        url: '/watchlog'
    });

    var formatResult = function(result) {
        if (result.loading) {
            return result.text;
        }
        return '<div>' +
            '<img src="' + result.poster_xs + '"/>' +
            '<span>' + result.title + '</span>' +
            '</div>';
    };

    var formatSelection = function(item) {
        return item.title || item.name;
    };

    var getVideos = function(title, videoList) {
        videoList.reset();
        $.ajax({
            url: '/videos',
            data: {
                title: title
            },
            dataType: 'json',
            success: function(data) {
                console.log(data);
                data.videos.forEach(function(video) {
                    videoList.add(new Video({
                        id: video.id,
                        title: video.title
                    }));
                });
            },
            failure: function() {
                console.log('failure');
            }
        });
    };

    var Video = Backbone.Model.extend({
        defaults: {
            id: undefined
        }
    });

    var VideoList = Backbone.Collection.extend({
        model: Video
    });

    var VideoListView = Backbone.View.extend({
        initialize: function(options) {
            _.bindAll(this, 'render', 'renderAdd', 'addVideo');
            this.template = options.template;
            this.collection.on('add', this.addVideo);
        },

        addVideo: function(video) {
            return this.renderAdd(video);
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

    var videoViewTemplate = _.template($('#video-template').html());
    var VideoView = Backbone.View.extend({
        initialize: function(options) {
            _.bindAll(this, 'render');
            this.template = videoViewTemplate;
            this.model.on('change', this.render);
        },
        render: function(model) {
            if (model && model.changedAttributes('selected')) {
                if (this.model.get('selected')) {
                    this.$el.addClass('selected');
                } else {
                    this.$el.removeClass('selected');
                }
            }
            if (!model || model.changedAttributes('id')) {
                this.$el.html(this.template({model: this.model.toJSON()}));
            }
            return this;
        }
    });

    var LogEntryView = Backbone.View.extend({
        el: $('#log-entry'),
        events: {
            'click button.select-video': 'selectVideo',
            'change input#video-id': 'videoIdChanged'
        },

        initialize: function() {
            _.bindAll(this, 'render', 'selectVideo', 'videoIdChanged');
            this.watchLog = new WatchLog();
            this.videoCandidates = new VideoList();

            this.templateTitleEntry = _.template($('#title-entry').html());
            this.videoListView = new VideoListView({
                template: _.template($('#video-list-template').html()),
                collection: this.videoCandidates
            });
            this.render();
        },

        selectVideo: function(e, video) {
            var newlySelected = video || this.videoCandidates.find(function(v) {
                return v.id === $(e.currentTarget).data('video-id');
            });
            if (newlySelected !== this.videoSelected) {
                if (this.videoSelected) {
                    this.videoSelected.set({selected: false});
                }
                this.videoSelected = newlySelected;
                this.videoSelected.set({selected: true});
            }
            return this;
        },

        videoIdChanged: function(e) {
            var id = $(e.currentTarget).val();
            if (!id) {
                return this;
            }

            var selected = this.videoCandidates.find(function(v) {
                return v.id === id;
            });
            if  (!selected) {
                selected = new Video({id: id});
                this.videoCandidates.push(selected);
            }
            this.selectVideo(undefined, selected);
            $(e.currentTarget).val('');
            return this;
        },

        render: function() {
            this.$el.html(this.templateTitleEntry({
                watchLog: this.watchLog.toJSON()
            }));
            this.$el.append(this.videoListView.render().el);

            var self = this;
            var titleSelect = '#title-select';
            $(titleSelect).select2({
                ajax: {
                    url: "/search-artwork",
                    dataType: 'json',
                    delay: 500,
                    data: function(params) {
                        return {
                            title: params.term
                        };
                    },
                    processResults: function(data, page) {
                        self.videoCandidates.reset();
                        return {
                            results: data.results.map(function(result) {
                                result.poster_xs = data.image_xs + result.poster_path
                                return result;
                            })
                        };
                    }
                },
                escapeMarkup: function(markup) {return markup;},
                minimumInputLength: 1,
                templateResult: function(result) {
                    result.title = result.title || result.name;
                    return formatResult(result);
                },
                templateSelection: function(item) {
                    return formatSelection(item);
                }
            });
            $(titleSelect).on('change', function(e) {
                var item = $(titleSelect).select2('data')[0];
                self.watchLog.set({
                    'title': item.title,
                    'poster_url': item.poster_xs
                });
                getVideos(item.title, self.videoCandidates);
            });

            return this;
        }
    });

    var logEntryView = new LogEntryView();
});
