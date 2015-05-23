import uuid
import datetime
import dynamo
import settings
import tmdb


# TODO these should belong to tmdb module
SOURCE_TMDB = 'tmdb'
MEDIA_TYPE_MOVIE = 'movie'
MEDIA_TYPE_TV = 'tv'


class Artwork():
    table_name = 'Artwork'

    def __init__(self, **kwargs):
        self.artwork_id = kwargs.get('artwork_id') or str(uuid.uuid4())
        self.source = kwargs.get('source')
        self.original_id = kwargs.get('original_id')
        self.original_title = kwargs.get('original_title')
        self.title = kwargs.get('title')
        self.media_type = kwargs.get('media_type')
        self.release_date = kwargs.get('release_date')
        self.first_air_date = kwargs.get('first_air_date')
        self.last_air_date = kwargs.get('last_air_date')
        self.posters = kwargs.get('posters')
        self.backdrops = kwargs.get('backdrops')

    def to_client(self):
        def to_image(image):
            return image if isinstance(image, dict) else image.to_client()

        return {
            'artwork_id': self.artwork_id,
            'source': self.source,
            'original_id': self.original_id,
            'original_title': self.original_title,
            'title': self.title,
            'media_type': self.media_type,
            'release_date': self.release_date,
            'first_air_date': self.first_air_date,
            'last_air_date': self.last_air_date,
            'posters': list(map(to_image, self.posters)),
            'backdrops': list(map(to_image, self.backdrops))
        }

    @classmethod
    def get_by_id(cls, artwork_id):
        rs = dynamo.query(cls.table_name, artwork_id__eq=artwork_id)
        for item in rs:
            return Artwork(**item)
        return None

    @classmethod
    def get_by_source(cls, source, original_id):
        rs = dynamo.query(cls.table_name,
                          source__eq=source,
                          original_id__eq=original_id,
                          index='source-original_id-index')
        for item in rs:
            return Artwork(**item)
        return None

    @classmethod
    def create_full(cls, source, original_id, **kwargs):
        if source == SOURCE_TMDB:
            media_type = kwargs.get('media_type')

            images = tmdb.images(original_id, media_type)

            def create_poster(image):
                original_id = image.get('file_path')
                return ArtworkImage.create_poster(SOURCE_TMDB, original_id)

            def create_backdrop(image):
                original_id = image.get('file_path')
                return ArtworkImage.create_backdrop(SOURCE_TMDB, original_id)

            posters = list(map(create_poster, images.get('posters')))
            backdrops = list(map(create_backdrop, images.get('backdrops')))

            if media_type == MEDIA_TYPE_TV:
                media = tmdb.tv(original_id)
                artwork = Artwork(source=source,
                                  original_id=original_id,
                                  original_title=media.get('original_name'),
                                  title=media.get('name'),
                                  media_type=media_type,
                                  first_air_date=media.get('first_air_date'),
                                  last_air_date=media.get('last_air_date'),
                                  posters=posters,
                                  backdrops=backdrops)
            elif media_type == MEDIA_TYPE_MOVIE:
                media = tmdb.movie(original_id)
                artwork = Artwork(source=source,
                                  original_id=original_id,
                                  original_title=media.get('original_title'),
                                  title=media.get('title'),
                                  media_type=media_type,
                                  release_date=media.get('release_date'),
                                  posters=posters,
                                  backdrops=backdrops)
            else:
                # unexpected. illegal
                return None

            return artwork

    def update(self):
        dynamo.update(self.table_name, self.to_client())
        return self

    def update_full(self):
        ArtworkImage.bulk_update(self.posters)
        ArtworkImage.bulk_update(self.backdrops)
        return self.update()


class ArtworkImage():

    table_name = 'ArtworkImage'

    def __init__(self, **kwargs):
        self.artwork_image_id = kwargs.get('artwork_image_id')
        self.source = kwargs.get('source')
        self.original_id = kwargs.get('original_id')
        self.paths = kwargs.get('paths')

    @classmethod
    def bulk_update(cls, image_list):
        dynamo.batch_write(
            cls.table_name, map(lambda x: x.to_client(), image_list))

    def update(self):
        dynamo.update(self.table_name, self.__dict__)
        return self

    def to_client(self):
        return {
            'artwork_image_id': self.artwork_image_id,
            'paths': self.paths
        }

    @classmethod
    def get_by_id(cls, artwork_image_id):
        rs = dynamo.query(
            cls.table_name,
            artwork_image_id__eq=artwork_image_id)
        for val in rs:
            return ArtworkImage(**val)
        return None

    @classmethod
    def get_by_source(cls, source, original_id):
        rs = dynamo.query(
            cls.table_name,
            source__eq=source, original_id__eq=original_id,
            index='source-original_id-index')

        for val in rs:
            return ArtworkImage(**val)
        return None

    @classmethod
    def create_poster(cls, source, original_id):
        return cls.create(
            source, original_id, url_small=settings.POSTER_XS)

    @classmethod
    def create_backdrop(cls, source, original_id):
        return cls.create(
            source, original_id, url_small=settings.BACKDROP_SMALL)

    @classmethod
    def create(cls, source, original_id, **kwargs):
        if source == SOURCE_TMDB:
            item = ArtworkImage(artwork_image_id=str(uuid.uuid4()),
                                source=source,
                                original_id=original_id)
            item.paths = {
                'small': '%s%s' % (kwargs.get('url_small'), original_id),
                'original': '%s%s' % (settings.IMAGE_URI_ORIGINAL, original_id)
            }
            return item
        else:
            return None


class WatchLog():

    table_name = 'WatchLog'

    def __init__(self, artwork=None, poster=None, backdrop=None, **kwargs):
        self.watchlog_id = kwargs.get('watchlog_id') or str(uuid.uuid4())
        self.title = kwargs.get('title')
        self.date = kwargs.get('date')
        self.log = kwargs.get('log')
        self.video_id = kwargs.get('video_id')
        self.entrydate = (kwargs.get('entrydate') or
                          datetime.datetime.now().isoformat())

        self.artwork = artwork
        self.poster = poster
        self.backdrop = backdrop

    def to_table(self):
        return {
            'watchlog_id': self.watchlog_id,
            'title': self.title,
            'date': self.date,
            'log': self.log,
            'entrydate': self.entrydate,
            'artwork_id': self.artwork.artwork_id,
            'poster_id': self.poster.artwork_image_id if self.poster else '',
            'backdrop_id': (
                self.backdrop.artwork_image_id if self.backdrop else '')
        }

    def to_client(self):
        return {
            'watchlog_id': self.watchlog_id,
            'title': self.title,
            'date': self.date,
            'log': self.log,
            'entrydate': self.entrydate,
            'artwork': self.artwork.to_client() if self.artwork else '',
            'poster': self.poster.to_client() if self.poster else '',
            'backdrop': self.backdrop.to_client() if self.backdrop else ''
        }

    def update(self):
        dynamo.update(self.table_name, self.to_table())

    @classmethod
    def create(cls, **kwargs):
        artwork = Artwork.get_by_id(kwargs.get('artwork_id'))
        if 'poster_id' in kwargs:
            poster = ArtworkImage.get_by_id(kwargs.get('poster_id'))
        if 'backdrop_id' in kwargs:
            backdrop = ArtworkImage.get_by_id(kwargs.get('backdrop_id'))

        kwargs.pop('artwork', None)
        kwargs.pop('poster', None)
        kwargs.pop('backdrop', None)

        return WatchLog(artwork, poster, backdrop, **kwargs)

    @classmethod
    def get_all(cls, **kwargs):
        def to_instance(result):
            artwork = Artwork.get_by_id(result.get('artwork_id'))
            poster = (ArtworkImage.get_by_id(result.get('poster_id'))
                      if result.get('poster_id') else None)
            backdrop = (ArtworkImage.get_by_id(result.get('backdrop_id'))
                        if result.get('backdrop_id') else None)
            return WatchLog(artwork, poster, backdrop, **result)

        rs = dynamo.scan(cls.table_name, **kwargs)
        return map(to_instance, rs)

    @classmethod
    def get_by_id(cls, watchlog_id):
        rs = dynamo.query(cls.table_name, watchlog_id__eq=watchlog_id)
        for val in rs:
            return WatchLog(**val)
        return None

    @classmethod
    def get(cls, **kwargs):
        rs = dynamo.query(cls.table_name, **kwargs)
        return map(WatchLog, rs)


class User():
    def __init__(self, user_id):
        self.user_id = user_id
        self._is_authenticated = True
        self._is_active = True
        self._is_anonymous = False

    @classmethod
    def get_by_id(cls, user_id):
        if user_id == settings.MASTER_USER:
            return User(user_id)
        return None

    @classmethod
    def get_by_credentials(cls, username, password):
        if (username == settings.MASTER_USER and
                password == settings.MASTER_PASS):
            return User(settings.MASTER_USER)
        return None

    @property
    def user_id(self):
        return self._user_id

    @user_id.setter
    def user_id(self, value):
        self._user_id = value

    def is_authenticated(self):
        '''
        flask_login
        '''
        return self._is_authenticated

    def is_active(self):
        '''
        flask_login
        '''
        return self._is_active

    def is_anonymous(self):
        '''
        flask_login
        '''
        return self._is_anonymous

    def get_id(self):
        '''
        flask_login
        '''
        return self.user_id
