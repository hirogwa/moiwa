from flask import Flask, Response, render_template, request
from flask.ext.sqlalchemy import SQLAlchemy
import json
import models
import os
import settings
from urllib.request import urlopen
from urllib.parse import quote


dbuser = 'vagrant'
dbpass = 'usagi'
dbname = 'vagrant'
dbhost = 'localhost'

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://{}:{}@{}/{}'.format(
    dbuser, dbpass, dbhost, dbname)
db = SQLAlchemy(app)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/watchlog', methods=['POST'])
def watchlog():
    if 'POST' == request.method:
        data = request.get_json()
        watchlog = models.WatchLog(data)
        db.session.add(watchlog)
        db.session.commit()
    else:
        pass

    result = {'result': 'success!'}
    return json_response(result)


@app.route('/watchlogs', methods=['GET'])
def watchlogs():
    def to_data(d):
        return d.to_dict()

    return json_response(
        list(map(to_data, models.WatchLog.query.order_by(
            models.WatchLog.date.desc()).all())))


@app.route('/ping', methods=['GET'])
def ping():
    print(request.form)
    print(request.args)
    print(request.get_json())
    return 'hi there!'


@app.route('/video', methods=['GET'])
def video():
    uri = '%s?id=%s&part=snippet,statistics&key=%s' % (
        settings.VIDEO_DETAIL,
        request.args.get('id'),
        settings.YOUTUBE_API_KEY)

    result = resource_as_dict(uri)

    ret = result.get('items')[0]

    return json_response(ret)


@app.route('/search-videos', methods=['GET'])
def search_videos():
    query = quote('%s trailer' % (request.args.get('title')))
    uri = '%s?key=%s&part=id,snippet&maxResults=5&q=%s' % (
        settings.VIDEO_SEARCH,
        settings.YOUTUBE_API_KEY,
        query
    )

    result = resource_as_dict(uri)

    def get_video(api_item):
        return {
            'id': api_item.get('id').get('videoId'),
            'title': api_item.get('snippet').get('title')
        }
    ret = {
        'videos': list(map(get_video, result.get('items'))),
        'all': result.get('items')
    }

    return json_response(ret)


@app.route('/search-artwork', methods=['GET'])
def search_artwork():
    query = quote(request.args.get('title'))
    uri = '%s?query=%s&api_key=%s' % (
        settings.MULTI_SEARCH,
        query,
        settings.TMDB_API_KEY
    )
    print(uri.encode('utf-8'))
    resource = urlopen(uri)
    result = resource.read().decode(resource.headers.get_content_charset())
    ret = {
        'results': json.loads(result).get('results')[:10],
        'image_xs': settings.POSTER_XS
    }

    return json_response(ret)


@app.route('/artwork_images', methods=['GET'])
def artwork_images():
    id = request.args.get('id')
    media_type = request.args.get('media_type')

    base_url = settings.TV_URL if media_type == 'tv' else settings.MOVIE_URL
    url = '%s/%s/images?api_key=%s' % (base_url, id, settings.TMDB_API_KEY)
    data = resource_as_dict(url)

    def get_image(item, uri_base):
        return {
            'file_path': item.get('file_path'),
            'sample_uri': '%s%s' % (uri_base, item.get('file_path')),
            'all': item
        }

    def poster_xs(item):
        return get_image(item, settings.POSTER_XS)

    def backdrop_small(item):
        return get_image(item, settings.BACKDROP_SMALL)

    ret = {
        'posters': list(map(poster_xs, data.get('posters'))),
        'backdrops': list(map(backdrop_small, data.get('backdrops'))),
    }

    return json_response(ret)


def json_response(dict_data):
    return Response(json.dumps(dict_data), mimetype='application/json')


def resource_as_dict(url):
    print(url)
    resource = urlopen(url)
    result = resource.read().decode(resource.headers.get_content_charset())
    return json.loads(result)


if __name__ == '__main__':
    app.debug = True
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000))
    )
