$(function() {
    var Artwork = Backbone.Model.extend({
    });

    var WatchLog = Backbone.Model.extend({
        defaults: {
            title: "",
            video_id: '',
            date: new Date().toISOString().slice(0, 10)
        },
        url: '/watchlog'
    });

    var Video = Backbone.Model.extend({
        defaults: {
            id: ''
        }
    });

    var VideoList = Backbone.Collection.extend({
        model: Video
    });

    var videoListViewTemplate = _.template($('#video-list-template').html());
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

    var videoViewTemplate = _.template($('#video-template').html());
    var VideoView = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this, 'render');
            this.template = videoViewTemplate;
            this.model.on('change', this.render);
        },

        render: function(model) {
            var attrSelected = 'selected';
            if (model && model.changedAttributes(attrSelected)) {
                if (this.model.get(attrSelected)) {
                    this.$el.addClass(attrSelected);
                } else {
                    this.$el.removeClass(attrSelected);
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
            'click button#save-log': 'saveWatchLog',
            'click button#add-video-id': 'videoIdChanged',
            'change input#watchlog-title-manual-entry': 'changeLogTitle',
            'change input#watch-date': 'changeWatchDate'
        },

        initialize: function() {
            _.bindAll(this, 'render', 'renderOnArtworkChange', 'renderAll',
                      'selectVideo', 'videoIdChanged', 'changeLogTitle',
                      'changeWatchDate');
            var artwork = new Artwork();
            artwork.on('change', this.renderOnArtworkChange);
            this.watchLog = new WatchLog({artwork: artwork});
            this.watchLog.on('change', this.render);
            this.videoCandidates = new VideoList();
            this.videoListView = new VideoListView({
                collection: this.videoCandidates
            });

            this.template = _.template($('#log-entry-template').html());
            this.render();
        },

        changeWatchDate: function(e) {
            this.watchLog.set({'date': $(e.currentTarget).val()});
            return this;
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
            var videoId = e ? $(e.currentTarget).data('video-id') : video.id;
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
            var elId = '#video-id';
            var id = $(elId).val();
            if (!id) {
                return this;
            }

            var selected = this.videoCandidates.find(function(v) {
                return v.id === id;
            });
            if (!selected) {
                selected = new Video({id: id});
                this.videoCandidates.push(selected);
            }
            this.selectVideo(undefined, selected);
            $(elId).val('');
            return this;
        },

        renderOnArtworkChange: function() {
            return this.renderAll();
        },

        render: function(model) {
            if (!model || model.changed['tmdb_id']) {
                return this.renderAll(model);
            }
            if (model.changed['title']) {
                this.$('#watchlog-title').val(model.get('title'));
            }
            return this;
        },

        renderAll: function() {
            this.$el.html(this.template({
                watchLog: this.watchLog.toJSON(),
                artwork: this.watchLog.get('artwork').toJSON()
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
                var original_title = item.original_title || item.original_name;
                var title = item.title || item.name;
                self.watchLog.get('artwork').set({
                    'tmdb_id': item.id,
                    'original_title': original_title,
                    'title': title,
                    'poster_url': item.poster_xs,
                    'release_date': item.release_date
                });
                self.watchLog.set({
                    'title': original_title || title
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
