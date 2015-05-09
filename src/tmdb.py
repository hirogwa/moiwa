import settings
import json
from urllib.request import urlopen

MEDIA_TYPE_MOVIE = 'movie'
MEDIA_TYPE_TV = 'tv'


def movie(tmdb_id):
    return resource_as_dict('%s/%s' % (settings.MOVIE_URL, tmdb_id))


def tv(tmdb_id):
    return resource_as_dict('%s/%s' % (settings.TV_URL, tmdb_id))


def images(tmdb_id, media_type):
    if media_type == MEDIA_TYPE_TV:
        baseurl = settings.TV_URL
    elif media_type == MEDIA_TYPE_MOVIE:
        baseurl = settings.MOVIE_URL
    else:
        # unexpected. illegal
        return None
    return resource_as_dict('%s/%s/images' % (baseurl, tmdb_id))


def resource_as_dict(baseurl):
    print('outgoing request')
    resource = urlopen('%s?api_key=%s' % (baseurl, settings.TMDB_API_KEY))
    result = resource.read().decode(resource.headers.get_content_charset())
    return json.loads(result)
