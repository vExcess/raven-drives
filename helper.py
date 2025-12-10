import sqlite3
import uuid
import mailjet_rest
import os

api_key = os.environ['mailjet_key']
api_secret = os.environ['mailjet_secret']
mailjet = mailjet_rest.Client(auth=(api_key, api_secret), version='v3.1')

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
        CREATE TABLE IF NOT EXISTS pending_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            display_name TEXT NOT NULL,
            code TEXT NOT NULL
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
            status TEXT DEFAULT 'open',
            email TEXT,
            display_name TEXT
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
            status TEXT DEFAULT 'open',
            email TEXT,
            display_name TEXT
        )
    ''')
    conn.commit()
    conn.close()

def add_offer(email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price):
    conn = get_db_connection()
    conn.execute('INSERT INTO offers (email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
                 (email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price))
    conn.commit()
    conn.close()

def get_open_offers():
    conn = get_db_connection()
    offers = conn.execute('SELECT * FROM offers WHERE status = "open" ORDER BY pickup_time DESC').fetchall()
    conn.close()
    return offers

def add_request(email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price):
    conn = get_db_connection()
    conn.execute('INSERT INTO requests (email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
                 (email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price))
    conn.commit()
    conn.close()

def get_open_requests():
    conn = get_db_connection()
    requests = conn.execute('SELECT * FROM requests WHERE status = "open" ORDER BY pickup_time DESC').fetchall()
    conn.close()
    return requests 

def add_user(email, password, display_name, domain):
    code = generate_code()
    sendUserConfirmationEmail(email, code, domain)
    conn = get_db_connection()
    conn.execute('INSERT INTO pending_users (email, password, display_name, code) VALUES (?, ?, ?, ?)', (email, password, display_name, code))
    conn.commit()
    conn.close()

def confirm_user(code):
    # check that the code is valid
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM pending_users WHERE code = ?', (code,)).fetchone()
    conn.close()
    if user:
        # move the user to the users table
        conn = get_db_connection()
        conn.execute('INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)', (user['email'], user['password'], user['display_name']))
        conn.commit()
        conn.close()
        # delete the user from the pending_users table
        conn = get_db_connection()
        conn.execute('DELETE FROM pending_users WHERE code = ?', (code,))
        conn.commit()
        conn.close()
        return True
    return False
    
def get_user_from_email(email):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    return user

# Only used for attaching contact info to requests and offers
def get_user_from_display_name(display_name):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE display_name = ?', (display_name,)).fetchone()
    conn.close()
    return user

def check_password(email, password):
    user = get_user_from_email(email)
    if user:
        return user['password'] == password
    return False

def generate_code():
    return str(uuid.uuid4())

def sendUserConfirmationEmail(email, code, domain):

    # TODO: replace with actual domain and official email adress
    data = {
        'Messages': [
            {
                    "From": {
                            "Email": "darkphoton31@gmail.com",
                            "Name": "Raven Drives Account Confirmation"
                    },
                    "To": [
                            {
                                    "Email": email
                            }
                    ],
                    "Subject": "Confirm Raven Drives email address",
                    "TextPart": "",
                    "HTMLPart": "<h1>Confirm Raven Drives email address</h1><p>Thank you for using Raven Drives!<br><br>Please confirm your email address by navagating to: <a href='http://" + domain + "/confirm_email/" + code + "'>RavenDrives.org/confirm_email/" + code + "</a>.<p>This is a one time confirmation.</p><br><p>In Christ, <br><br>Jared Gleisner <br>If you did not attempt to sign up for Raven Drives, simply ignore this email, your account will not be created unless you confirm it here.<br>ps. Yes, I know this looks very not legit, there's not much I can do about it without spending lots of money on Azure or a Goolge Buisness email.</p>",
            }
        ]
    }
    
    result = mailjet.send.create(data=data)
    print(result.status_code, result.json())