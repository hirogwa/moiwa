from web import db
import datetime


class WatchLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text)
    date = db.Column(db.DateTime)
    log = db.Column(db.Text)
    poster_file_path = db.Column(db.Text)
    backdrop_file_path = db.Column(db.Text)
    video_id = db.Column(db.Text)
    entrydate = db.Column(db.DateTime)

    def __init__(self, kwargs):
        self.title = kwargs.get('title')
        self.date = kwargs.get('date')
        self.log = kwargs.get('log')
        self.poster_file_path = kwargs.get('poster').get('file_path')
        self.backdrop_file_path = kwargs.get('backdrop').get('file_path')
        self.video_id = kwargs.get('video_id')
        self.entrydate = datetime.datetime.now()

    def to_dict(self):
        return {
            'title': self.title,
            'date': self.date.isoformat(),
            'log': self.log,
            'video_id': self.video_id,
            'entrydate': self.entrydate.isoformat()
        }
