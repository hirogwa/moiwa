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


@app.route('/artwork', methods=['GET', 'POST'])
def artwork():
    if 'POST' == request.method:
        artwork = models.Artwork(request.get_json())
        db.session.add(artwork)
        db.session.commit()
        print(artwork)
    else:
        pass
    return bootstrap()


@app.route('/ping', methods=['GET'])
def ping():
    print(request.form)
    print(request.args)
    print(request.get_json())
    return 'hi there!'


@app.route('/videos', methods=['GET'])
def videos():
    query = quote('%s trailer' % (request.args.get('title')))
    uri = '%s?key=%s&part=id,snippet&maxResults=5&q=%s' % (
        settings.VIDEO_SEARCH,
        settings.YOUTUBE_API_KEY,
        query
    )
    print(uri)
    resource = urlopen(uri)
    result = resource.read().decode(resource.headers.get_content_charset())
    ret = json.loads(result)

    def get_video(api_item):
        return {
            'id': api_item.get('id').get('videoId'),
            'title': api_item.get('snippet').get('title')
        }
    ret = {
        'videos': list(map(get_video, ret.get('items'))),
        'all': ret.get('items')
    }

    return Response(json.dumps(ret), mimetype='application/json')

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
        'image_xs': settings.IMAGE_XS
    }

    return Response(json.dumps(ret), mimetype='application/json')


@app.route('/')
def bootstrap():
    content = {'stuff': 'very friendly Sapporo local ski resort'}
    return render_template('index.html', content=content)

if __name__ == '__main__':
    app.debug = True
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000))
    )
