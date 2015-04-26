var models = require('../models/models.js');
var ImageList = Backbone.Collection.extend({
    model: models.Image
});

var VideoList = Backbone.Collection.extend({
    model: models.Video
});

module.exports = {
    ImageList: ImageList,
    VideoList: VideoList
};
