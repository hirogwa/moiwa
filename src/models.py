from web import db


class Artwork(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    year = db.Column(db.Integer)
    watchlogs = db.relationship('WatchLog', backref='artwork', lazy='dynamic')


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)
    watchlogs = db.relationship('WatchLog', backref='user', lazy='dynamic')


class WatchLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    artwork_id = db.Column(db.Integer, db.ForeignKey('artwork.id'))
    viewdate = db.Column(db.DateTime)
    log = db.Column(db.Text)
    entrydate = db.Column(db.DateTime)
