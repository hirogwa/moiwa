var models = require('../models/models.js');
var collections = require('../collections/collections.js');
var views = require('./views.js');

var logEntryViewTemplate = require('./log-entry-view.html');
var LogEntryView = Backbone.View.extend({
    el: $('#view-container'),
    events: {
        'click #poster-list button.select-image': 'selectPoster',
        'click #backdrop-list button.select-image': 'selectBackdrop',
        'click button.select-video': 'selectVideo',
        'click button#save-log': 'saveWatchLog',
        //'click button#add-video-id': 'addVideo',
        'change input#video-id': 'addVideo',
        'change input#watch-date': 'changeWatchDate'
    },

    initialize: function() {
        _.bindAll(this,
                  'render',
                  'renderOnArtworkChange',
                  'renderAll',
                  'selectPoster',
                  'selectBackdrop',
                  'addVideo',
                  'selectVideo',
                  'changeWatchDate',
                  'getVideos');

        var artwork = new models.Artwork();
        artwork.on('change', this.renderOnArtworkChange);
        this.watchLog = new models.WatchLog({artwork: artwork});
        this.watchLog.on('change', this.render);
        this.posterCandidates = new collections.ImageList();
        this.posterListView = new views.ImageListView({
            collection: this.posterCandidates
        });
        this.backdropCandidates = new collections.ImageList();
        this.backdropListView = new views.ImageListView({
            collection: this.backdropCandidates
        });
        this.videoCandidates = new collections.VideoList();
        this.videoListView = new views.VideoListView({
            collection: this.videoCandidates
        });

        this.template = logEntryViewTemplate;
        this.render();
    },

    changeWatchDate: function(e) {
        this.watchLog.set({'date': $(e.currentTarget).val()});
        return this;
    },

    saveWatchLog: function() {
        var title = $('#watchlog-title').val();
        if (!title) {
            console.log('title empty');
            return;
        }

        if (this.watchLog.get('artwork')) {
            this.watchLog.set({
                title: title,
                log: $('#watchlog-content').val(),
                date: $('#watch-date').val()
            });
            this.watchLog.save({
                artwork: this.watchLog.get('artwork'),
                title: this.watchLog.get('title'),
                date: this.watchLog.get('date'),
                log: this.watchLog.get('log'),
                video_id: this.watchLog.get('video_id'),
                poster: this.watchLog.get('poster'),
                backdrop: this.watchLog.get('backdrop')
            }, {
                success: function(data) {
                    console.log('watchlog saved. redirect...?');
                },
                error: function(data) {
                    console.log('failed to save watch log.');
                }
            });
        } else {
            console.log('artwork not selected');
        }
        console.log(this.watchLog);
    },

    selectImage: function(e, collection, current) {
        var artworkImageId = $(e.currentTarget).data('artwork-image-id');
        var newlySelected = collection.find(function(image) {
            return image.get('artwork_image_id') === artworkImageId;
        });
        if (newlySelected != current) {
            if (current) {
                current.set({selected: false});
            }
            newlySelected.set({selected: true});
        }
        return newlySelected;
    },

    selectPoster: function(e) {
        this.watchLog.set({
            poster: this.selectImage(
                e,
                this.posterCandidates,
                this.watchLog.get('poster')
            )
        });
        return this;
    },

    selectBackdrop: function(e) {
        this.watchLog.set({
            backdrop: this.selectImage(
                e,
                this.backdropCandidates,
                this.watchLog.get('backdrop')
            )
        });
        return this;
    },

    selectVideo: function(e, video) {
        var videoId = e ? $(e.currentTarget).data('video-id') : video.id;
        var newlySelected = video || this.videoCandidates.find(function(v) {
            return v.get('id') === videoId;
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

    addVideo: function() {
        var elId = '#video-id';
        var id = $(elId).val();
        if (!id) {
            return this;
        }

        var selected = this.videoCandidates.find(function(v) {
            return v.id === id;
        });
        if (!selected) {
            selected = new models.Video({id: id});
            this.videoCandidates.add(selected);
        }
        this.selectVideo(null, selected);
        $(elId).val('');
        return this;
    },

    renderOnArtworkChange: function() {
        return this.renderAll();
    },

    render: function(model) {
        if (!model || model.changed.tmdb_id) {
            return this.renderAll(model);
        }
        if (model.changed.title) {
            this.$('#watchlog-title').val(model.get('title'));
        }
        return this;
    },

    renderAll: function() {
        this.$el.html(this.template({
            watchLog: this.watchLog.toJSON(),
            artwork: this.watchLog.get('artwork').toJSON()
        }));
        this.$('#poster-list').append(this.posterListView.render().el);
        this.$('#backdrop-list').append(this.backdropListView.render().el);
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
                        results: data.results
                    };
                }
            },
            escapeMarkup: function(markup) {return markup;},
            minimumInputLength: 1,
            templateResult: function(result) {
                return formatResult(result);
            },
            templateSelection: function(item) {
                return formatSelection(item);
            }
        });

        $(titleSelect).on('change', function(e) {
            var item = $(titleSelect).select2('data')[0];
            self.watchLog.set({
                'title': item.display_title
            });
            self.getArtwork(item);
            self.getVideos(item.display_title);
        });

        return this;
    },

    getArtwork: function(item) {
        console.log(item);
        this.posterCandidates.reset();
        this.backdropCandidates.reset();
        var self = this;
        $.ajax({
            url: 'artwork',
            data: {
                source: item.source,
                original_id: item.original_id,
                media_type: item.media_type
            },
            dataType: 'json',
            success: function(data) {
                self.watchLog.set({
                    'artwork': data
                });
                data.backdrops.forEach(function(b) {
                    self.backdropCandidates.add(new models.Image({
                        artwork_image_id: b.artwork_image_id,
                        uri: b.paths.small
                    }));
                });
                data.posters.forEach(function(p) {
                    self.posterCandidates.add(new models.Image({
                        artwork_image_id: p.artwork_image_id,
                        uri: p.paths.small
                    }));
                });
            },
            error: function(data) {
                console.log('failed to load images');
            }
        });
    },

    getVideos: function(title) {
        this.videoCandidates.reset();
        var self = this;
        $.ajax({
            url: '/search-videos',
            data: {
                title: title
            },
            dataType: 'json',
            success: function(data) {
                data.videos.forEach(function(video) {
                    self.videoCandidates.add(new models.Video({
                        id: video.id,
                        title: video.title
                    }));
                });
            },
            error: function() {
                console.log('failure');
            }
        });
    }
});

var formatResult = function(result) {
    if (result.loading) {
        return result.text;
    }
    return '<div>' +
        '<img src="' + result.poster_small + '"/>' +
        '<span>' + result.display_title + '</span>' +
        '</div>';
};

var formatSelection = function(item) {
    return item.title;
};

module.exports = {
    LogEntryView: LogEntryView
};
