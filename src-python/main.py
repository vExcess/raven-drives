from flask import Flask, request, session
import flask

app = Flask(__name__)
app.secret_key = 'super_secret_key'

import helper

with app.app_context():
    helper.init_db()

@app.context_processor
def inject_user():
    return dict(user_display_name=session.get('user_display_name'))

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

        # Check if there is a user for that email. If not, redirect to signup
        if not helper.get_user_from_email(email):
            return flask.redirect(flask.url_for('signup', redirect=redirect))

        # Since there is a user, check if the password is correct
        if not helper.check_password(email, password):
            return flask.redirect(flask.url_for('login', redirect=redirect))
        
        # Set the user's display name in a cookie
        flask.session['user_display_name'] = helper.get_user_from_email(email)['display_name']

        print(f"Sucessfully logged in for {flask.session['user_display_name']}")

        # If there is a supplied redirect, go there, otherwise default to index
        if redirect:
            return flask.redirect(flask.url_for(redirect))
        else:
            return flask.redirect(flask.url_for('index'))
        
    else:
        print(f"GET: {redirect}")
        return flask.render_template('login.html', redirect=redirect)

@app.route('/signup', defaults={'redirect': None}, methods=['GET', 'POST'])
@app.route('/signup/<redirect>', methods=['GET', 'POST'])
def signup(redirect):
    if request.method == 'POST':
        print("POST: signup")
        email = request.form.get('email')
        password = request.form.get('password')
        display_name = request.form.get('display_name')

        # Add user to database
        helper.add_user(email, password, display_name, request.host)

        return flask.redirect(flask.url_for('confirmation_sent'))
    
    else:
        print("GET: signup")
        return flask.render_template('signup.html', redirect=redirect)

@app.route('/confirmation_sent')
def confirmation_sent():
    return flask.render_template('confirmation_sent.html')
    
@app.route('/confirm_email/<code>', methods=['GET'])
def confirm_email(code):
    if request.method == 'GET':
        print("GET: confirm_email")

        # Check if the code is valid
        if not helper.confirm_user(code):
            return flask.redirect(flask.url_for('invalid_code'))

        return flask.render_template('success.html')

@app.route('/invalid_code')
def invalid_code():
    return flask.render_template('invalid_code.html')

@app.route('/offer', methods=['GET', 'POST'])
def offer():
    if request.method == 'POST':

        display_name = flask.session.get('user_display_name')
        # check if the user is logged in
        if not display_name:
            return flask.redirect(flask.url_for('login', redirect='offer'))

        pickup_location = request.form.get('pickup_location')
        dropoff_location = request.form.get('dropoff_location')
        pickup_time = request.form.get('pickup_time')
        dropoff_time = request.form.get('dropoff_time')
        price = request.form.get('price')
        email = helper.get_user_from_display_name(display_name)['email']

        helper.add_offer(email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price)

        return flask.redirect(flask.url_for('view_offers'))

    else:
        return flask.render_template('offer.html')

@app.route('/request', methods=['GET', 'POST'])
def commision():
    if request.method == 'POST':

        display_name = flask.session.get('user_display_name')
        # check if the user is logged in
        if not display_name:
            return flask.redirect(flask.url_for('login', redirect='request'))

        pickup_location = request.form.get('pickup_location')
        dropoff_location = request.form.get('dropoff_location')
        pickup_time = request.form.get('pickup_time')
        dropoff_time = request.form.get('dropoff_time')
        price = request.form.get('price')
        email = helper.get_user_from_display_name(display_name)['email']

        helper.add_request(email, display_name, pickup_location, dropoff_location, pickup_time, dropoff_time, price)

        return flask.redirect(flask.url_for('view_requests'))

    else:
        return flask.render_template('request.html')
        
@app.route('/view_offers')
def view_offers():
    offers = helper.get_open_offers()
    return flask.render_template('view_offers.html', offers=offers)

@app.route('/view_requests')
def view_requests():
    requests = helper.get_open_requests()
    return flask.render_template('view_requests.html', requests=requests)

if __name__ == '__main__':

    app.run(debug=True)
    