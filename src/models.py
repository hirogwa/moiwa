from web import db


class Artwork(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    year = db.Column(db.Integer)
    watchlogs = db.relationship('WatchLog', backref='artwork', lazy='dynamic')

    def __init__(self, kwargs):
        self.name = kwargs.get('name')
        self.year = kwargs.get('year')


class WatchLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    artwork_id = db.Column(db.Integer, db.ForeignKey('artwork.id'))
    viewdate = db.Column(db.DateTime)
    log = db.Column(db.Text)
    entrydate = db.Column(db.DateTime)
    # poster_url
