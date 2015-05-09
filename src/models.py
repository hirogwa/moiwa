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
            cls.table_name, artwork_image_id__eq=artwork_image_id)
        for val in rs:
            return ArtworkImage(val)
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

    def __init__(self, data, **kwargs):
        self.watchlog_id = data.get('watchlog_id') or str(uuid.uuid4())
        self.title = data.get('title')
        self.date = data.get('date')
        self.log = data.get('log')
        self.poster_id = data.get('poster_id')
        self.backdrop_id = data.get('backdrop_id')
        self.video_id = data.get('video_id')
        self.entrydate = (data.get('entrydate') or
                          datetime.datetime.now().isoformat())

    def update(self):
        dynamo.update(self.table_name, self.__dict__)

    @classmethod
    def get_all(cls, **kwargs):
        rs = dynamo.scan(cls.table_name, **kwargs)
        return map(WatchLog, rs)

    @classmethod
    def get(cls, **kwargs):
        rs = dynamo.query(cls.table_name, **kwargs)
        return map(WatchLog, rs)
