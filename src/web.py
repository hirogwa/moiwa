from flask import Flask, render_template
from flask.ext.sqlalchemy import SQLAlchemy
import os

dbuser = 'vagrant'
dbpass = 'usagi'
dbname = 'vagrant'
dbhost = 'localhost'

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://{}:{}@{}/{}'.format(
    dbuser, dbpass, dbhost, dbname)
db = SQLAlchemy(app)


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
