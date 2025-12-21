const { MongoClient } = require("mongodb");

const cryptography = require("./cryptography");

const { nowSeconds, secondsFromToken } = require("./utils");

const schema = require("./schema");

const mailer = require("./mailer");

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

function confirmEmail(code) {
    return users.updateOne(
        {  verification_codes: { $all: [code] } },
        {$set: {
            status: 1, 
            verification_codes: []
        }}
    );
}

function addUser(data, authToken) {
    const salt = cryptography.salt();

    const confirmationCode = cryptography.uuid();
    mailer.sendEmailConfirmation(data.email, confirmationCode);

    return users.insertOne({
        id: cryptography.uuid(),
        name: data.name,
        email: data.email,
        password_hash: cryptography.sha256(salt.toString() + data.password),
        salt: salt,
        session_tokens: [authToken],
        verification_codes: [confirmationCode],
        status: UNVERIFIED,
        rating: 0,
        payment_types: [],
        timestamp: nowSeconds()
    });
}

function saveUserToken(userid) {

}

function removeUserToken(userid, token) {
    return users.updateOne(
        { id: userid },
        {$pull: {
            session_tokens: { $in: [token] }
        }}
    );
}

function confirmUser() {
    // TODO: implement
}

function getUserFromEmail(email) {
    return users.findOne({ email });
}

function getUserFromToken(token) {
    return users.findOne({ 
        session_tokens: { $all: [token] }
    });
}

/*
    checks if email and password are correct
    if credentials are valid, returns a new auth token after saving it to the database
    if credentials are invalid, returns false
*/
async function authenticateUser(email, password) {
    const user = await getUserFromEmail(email);
    if (user) {
        const passwordHash = cryptography.sha256(user.salt.toString() + password);
        // check that password is correct
        if (cryptography.constTimeEquals(user.password_hash, passwordHash)) {
            // generate new auth token
            const authToken = `${nowSeconds()}-${cryptography.uuid()}`;
            
            // remove tokens that are over 90 days old
            const currSeconds = nowSeconds();
            const TOKEN_DAYS_LIFESPAN = 90;
            user.session_tokens = user.session_tokens.filter(tok => {
                return currSeconds - secondsFromToken(tok) > 60*60*24*TOKEN_DAYS_LIFESPAN
            });

            // add new auth save
            user.session_tokens.push(authToken);

            // write changes to database
            await users.updateOne({ id: user.id }, {$set: {
                session_tokens: user.session_tokens
            }});

            // return new auth token to be sent to user
            return authToken;
        } else {
            return "AuthError: Password is incorrect";
        }
    }
    return "AuthError: No user with this email exists";
}

module.exports = {
    connect,
    addUser,
    authenticateUser,
    getUserFromEmail,
    getUserFromToken,
    removeUserToken,
    confirmEmail
};