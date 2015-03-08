from flask import Flask
app = Flask(__name__)

@app.route('/')
def bootstrap():
    return 'very friendly Sapporo local ski resort'

if __name__ == '__main__':
    app.run()
