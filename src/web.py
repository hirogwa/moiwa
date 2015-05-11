from flask import Flask, Response, render_template, request
import json
import models
import os
import settings
from urllib.request import urlopen
from urllib.parse import quote
import flask_login

app = Flask(__name__)
app.secret_key = settings.SECRET_KEY

login_manager = flask_login.LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(userid):
    return models.User.get_by_id(userid)


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = models.User.get_by_credentials(username, password)
    if user:
        flask_login.login_user(user)


@app.route('/admin')
@flask_login.login_required
def admin():
    return render_template('admin.html')


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/artwork', methods=['GET'])
def artwork():
    artwork_id = request.args.get('artwork_id')
    source = request.args.get('source')
    original_id = request.args.get('original_id')
    media_type = request.args.get('media_type')

    if artwork_id:
        artwork = models.Artwork.get_by_id(artwork_id)
    else:
        artwork = models.Artwork.get_by_source(source, original_id)

    if not artwork:
        artwork = models.Artwork.create_full(
            source, original_id, media_type=media_type).update_full()

    return json_response(artwork.to_client())


@app.route('/watchlog', methods=['POST'])
def watchlog():
    if 'POST' == request.method:
        data = request.get_json()

        data['artwork_id'] = data.get('artwork').get('artwork_id')
        data['poster_id'] = data.get('poster').get('artwork_image_id')
        data['backdrop_id'] = data.get('backdrop').get('artwork_image_id')
        watchlog = models.WatchLog.create(**data)
        watchlog.update()
    else:
        pass

    result = {'result': 'success!'}
    return json_response(result)


@app.route('/watchlogs', methods=['GET'])
def watchlogs():
    logs = models.WatchLog.get_all()
    return json_response(list(map(lambda x: x.to_client(), logs)))


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
    results = json.loads(result).get('results')[:10]

    def result_to_client(result):
        result['source'] = models.SOURCE_TMDB
        result['original_id'] = result.get('id')
        result['display_title'] = (result.get('original_title') or
                                   result.get('original_name'))
        result['poster_small'] = '%s%s' % (
            settings.POSTER_XS, result.get('poster_path'))
        return result

    ret = {
        'results': list(map(result_to_client, results))
    }

    return json_response(ret)


def json_response(dict_data):
    return Response(json.dumps(dict_data), mimetype='application/json')


# TODO this module should not need this. consider deprecating
def resource_as_dict(url):
    print(url)
    resource = urlopen(url)
    result = resource.read().decode(resource.headers.get_content_charset())
    return json.loads(result)


@app.route('/ping', methods=['GET'])
def ping():
    print(request.form)
    print(request.args)
    print(request.get_json())
    return 'hi there!'


if __name__ == '__main__':
    app.debug = True
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000))
    )
