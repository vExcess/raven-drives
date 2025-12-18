const { MongoClient } = require("mongodb");

const Mailjet = require('node-mailjet');

const cryptography = require("./cryptography");

const { nowSeconds } = require("./utils");

const schema = require("./schema");

const OPEN = 0;
const BANNED = -1;
const UNVERIFIED = 0;
const VERIFIED = 1;

let myMongo = null;

// will hold the database connection
let db = null;

// will hold the collections
let users = null,
    offers = null,
    requests = null,
    reviews = null;


async function connect() {
    // setup client
    if (SECRETS.DB_PASSWORD && SECRETS.DB_PASSWORD.length > 0) {
        myMongo = new MongoClient(`mongodb://${SECRETS.DB_USER}:${SECRETS.DB_PASSWORD}@${SECRETS.DB_IP}:${SECRETS.DB_PORT}/?authSource=admin`);
        console.log(myMongo)
    } else {
        if (!SECRETS.DEV) {
            throw "Running in production without authentication is not allowed!";
        }
        console.log("WARNING: MongoDB is running without authentication");
        myMongo = new MongoClient(`mongodb://${SECRETS.DB_IP}:${SECRETS.DB_PORT}`);
    }

    // connect to database
    await myMongo.connect();

    // get the stuff we need
    db = myMongo.db("ravenDrives");        

    users = db.collection("users");
    offers = db.collection("offers");
    requests = db.collection("requests");
    reviews = db.collection("reviews");

    const preExistingCollections = await db.listCollections().toArray();
    function collectionExists(name) {
        for (let i = 0; i < preExistingCollections.length; i++) {
            if (preExistingCollections[i].name === name) {
                return true;
            }
        }
        return false;
    }

    // setup database schema validation
    await Promise.all(["users", "offers", "requests", "reviews"].map(collectionName => {
        const validator = schema.mongodbValidatorFromParsed(schema.parsedSchemas[collectionName]);
        if (collectionExists(collectionName)) {
            return db.command({
                collMod: collectionName,
                validator
            });
        } else {
            return db.createCollection(collectionName, {
                validator
            });
        }
    }));

    console.log("MongoDB connection established.");
}

function getUserOffers(id) {
    return offers.find({ creator: id });
}

function getUserRequests(id) {
    return requests.find({ creator: id });
}

function updateOfferStatus(id, status) {
    return offers.updateOne({ id }, {$set: {
        status: status
    }});
}

function updateRequestStatus(id, status) {
    return requests.updateOne({ id }, {$set: {
        status: status
    }});
}

function addOffer(requestId, status) {
    return offers.insertOne({
    //     id: int,
    //     creator: int,
    //     pickupLocation: string,
    //     dropoffLocation: string,
    //     pickupTime: int,
    //     price: double,
    //     // passenger seat count; driver not included
    //     availableSeats: int,
    //     totalSeats: int,
    //     usersServing: []string,
    //     // 0=open
    //     status: int,
    //     notes: string,
    //     timestamp: int,
    });
}

function getOpenOffers() {
    // consider using strings intstead of integers
    return offers
        .find({ status: OPEN })
        .sort({ pickupTime: 1 });
}

function addUser(data, authToken) {
    return users.insertOne({
        id: cryptography.uuid(),
        name: data.name,
        email: data.email,
        password_hash: cryptography.sha256(data.password),
        session_tokens: [authToken],
        status: UNVERIFIED,
        rating: 0,
        payment_types: [],
        timestamp: nowSeconds()
    });
}

function confirmUser() {
    // TODO: implement
}

function getUserFromEmail(email) {
    return users.findOne({ email });
}

function checkPassword(email, password) {
    // TODO: implement
}

let mailjet = null;

function connectToMailjet() {
    mailjet = Mailjet.apiConnect(
        SECRETS.MAILJET_KEY,
        SECRETS.MAILKEY_SECRET
    );
}

function sendUserConfirmationEmail(email, code, domain) {
    mailjet
        .post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: "darkphoton31@gmail.com",
                        Name: "Raven Drives Account Confirmation"
                    },
                    To: [
                        {
                            Email: email,
                            // Name: "passenger 1"
                        }
                    ],
                    Subject: "Confirm Raven Drives email address",
                    TextPart: "",
                    HTMLPart: `
                        <h1>Confirm Raven Drives email address</h1>
                        <p>
                            Thank you for using Raven Drives!
                            <br><br>
                            Please confirm your email address by navagating to: 
                            <a href='http://${domain}/confirm_email/${code}'>RavenDrives.org/confirm_email/${code}</a>.
                            <p>This is a one time confirmation.</p>
                            <br>
                            <p>
                                In Christ,
                                <br><br>
                                Jared Gleisner 
                                <br>
                                If you did not attempt to sign up for Raven Drives, simply ignore this email, your account will not be created unless you confirm it here.
                                <br>
                                ps. Yes, I know this looks very not legit, there's not much I can do about it without spending lots of money on Azure or a Google Buisness email.
                            </p>
                        </p>
                    `
                }
            ]
        })
        .then((result) => {
            console.log(result.body)
        })
        .catch((err) => {
            console.log(err.statusCode)
        });
}

module.exports = {
    connect,
    addUser
};