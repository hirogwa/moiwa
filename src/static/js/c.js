$(function() {
    var Artwork = Backbone.Model.extend({
    });

    var WatchLog = Backbone.Model.extend({
        defaults: {
            title: "New Title...",
            poster_url: '',
            tmdb_id: '',
            video_id: ''
        },
        url: '/watchlog'
    });

    var Video = Backbone.Model.extend({
        defaults: {
            id: undefined
        }
    });

    var VideoList = Backbone.Collection.extend({
        model: Video
    });

    var videoListViewTemplate = _.template($('#video-list-template').html());
    var VideoListView = Backbone.View.extend({
        initialize: function(options) {
            _.bindAll(this, 'render', 'renderAdd', 'addVideo');
            this.template = videoListViewTemplate;
            this.collection.on('add', this.addVideo);
            this.collection.on('reset', this.render);
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
            'change input#video-id': 'videoIdChanged',
            'click button#save-log': 'saveWatchLog',
            'change input#watchlog-title-manual-entry': 'changeLogTitle'
        },

        initialize: function() {
            _.bindAll(this, 'render', 'renderOnArtworkChange', 'renderAll',
                      'selectVideo', 'videoIdChanged', 'changeLogTitle');
            this.artwork = new Artwork();
            this.artwork.on('change', this.renderOnArtworkChange);
            this.watchLog = new WatchLog({artwork: this.artwork});
            this.watchLog.on('change', this.render);
            this.videoCandidates = new VideoList();
            this.videoListView = new VideoListView({
                collection: this.videoCandidates
            });

            this.template = _.template($('#log-entry-template').html());
            this.render();
        },

        changeLogTitle: function(e) {
            this.watchLog.set({'title': $(e.currentTarget).val()});
            return this;
        },

        saveWatchLog: function() {
            console.log(this.watchLog);
            this.watchLog.save();
        },

        selectVideo: function(e, video) {
            var videoId = $(e.currentTarget).data('video-id');
            var newlySelected = video || this.videoCandidates.find(function(v) {
                return v.id === videoId;
            });
            if (newlySelected !== this.videoSelected) {
                if (this.videoSelected) {
                    this.videoSelected.set({selected: false});
                }
                this.videoSelected = newlySelected;
                this.videoSelected.set({selected: true});
            }
            this.watchLog.set({video_id: videoId});
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

        renderOnArtworkChange: function() {
            return this.renderAll();
        },

        render: function(model) {
            if (!model || model.changed['tmdb_id']) {
                return this.renderAll(model);
            }
            return this;
        },

        renderAll: function() {
            this.$el.html(this.template({
                watchLog: this.watchLog.toJSON(),
                artwork: this.artwork.toJSON()
            }));
            this.$('#video-list').append(this.videoListView.render().el);

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
                    result.original_title = result.original_title ||
                        result.original_name;
                    return formatResult(result);
                },
                templateSelection: function(item) {
                    return formatSelection(item);
                }
            });

            $(titleSelect).on('change', function(e) {
                var item = $(titleSelect).select2('data')[0];
                self.artwork.set({
                    'tmdb_id': item.id,
                    'original_title': item.original_title || item.original_name,
                    'title': item.title || item.name,
                    'poster_url': item.poster_xs,
                });
                self.watchLog.set({
                });
                getVideos(item.original_title, self.videoCandidates);
            });

            return this;
        }
    });

    var formatResult = function(result) {
        if (result.loading) {
            return result.text;
        }
        return '<div>' +
            '<img src="' + result.poster_xs + '"/>' +
            '<span>' + result.original_title + '</span>' +
            '</div>';
    };

    var formatSelection = function(item) {
        return item.title;
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

    var logEntryView = new LogEntryView();
});
