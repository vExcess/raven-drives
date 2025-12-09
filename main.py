from flask import Flask, request
import flask

app = Flask(__name__)

import sqlite3

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            display_name TEXT NOT NULL
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pickup_location TEXT NOT NULL,
            dropoff_location TEXT NOT NULL,
            date TEXT,
            pickup_time TEXT NOT NULL,
            dropoff_time TEXT,
            price REAL NOT NULL,
            status TEXT DEFAULT 'open'
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pickup_location TEXT NOT NULL,
            dropoff_location TEXT NOT NULL,
            date TEXT,
            pickup_time TEXT NOT NULL,
            dropoff_time TEXT,
            price REAL NOT NULL,
            status TEXT DEFAULT 'open'
        )
    ''')
    conn.commit()
    conn.close()

with app.app_context():
    init_db()

@app.route('/', methods=['GET'])
def index():
    return flask.render_template('index.html')

@app.route('/login', defaults={'redirect': None}, methods=['GET', 'POST'])
@app.route('/login/<redirect>', methods=['GET', 'POST'])
def login(redirect):
    if request.method == 'POST':
        print(f"POST: {redirect}")
        email = request.form.get('email')
        password = request.form.get('password')
        display_name = request.form.get('display_name')

        # TO DO: verify and pass cookies. If the email is valid but not in database redirect to signup with the supplied email and password

        # if there is a supplied redirect, go there, otherwise default to index
        if redirect:
            return flask.render_template(redirect+".html")
        else:
            return flask.redirect(flask.url_for('index'))
        
    else:
        print(f"GET: {redirect}")
        return flask.render_template('login.html', redirect=redirect)
    
@app.route('/offer', methods=['GET', 'POST'])
def offer():
    if request.method == 'POST':

        pickup_location = request.form.get('pickup_location')
        dropoff_location = request.form.get('dropoff_location')
        date = request.form.get('date')
        pickup_time = request.form.get('pickup_time')
        dropoff_time = request.form.get('dropoff_time')
        price = request.form.get('price')

        # TO DO: add offer to database

        return flask.redirect(flask.url_for('index'))

    else:
        return flask.render_template('offer.html')

@app.route('/request', methods=['GET', 'POST'])
def commision():
    if request.method == 'POST':

        pickup_location = request.form.get('pickup_location')
        dropoff_location = request.form.get('dropoff_location')
        date = request.form.get('date')
        pickup_time = request.form.get('pickup_time')
        dropoff_time = request.form.get('dropoff_time')
        price = request.form.get('price')

        # TO DO: add request to database

        return flask.redirect(flask.url_for('index'))

    else:
        return flask.render_template('request.html')

if __name__ == '__main__':
    app.run(debug=True)
