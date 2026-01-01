const { MongoClient } = require("mongodb");

const cryptography = require("./cryptography");

const { nowSeconds, secondsFromToken } = require("./utils");

const schema = require("./schema");

const mailer = require("./mailer");

const fs = require("./hardened-fs");

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

// Important: Make sure when invalidating an auth token to remove it from the cache
// Map<token, [userData, lastAccessTime]>
let userTokenCache = {};
setInterval(() => {
    const now = nowSeconds();
    const tokens = Object.keys(userTokenCache);

    // every hour remove tokens that haven't been used in an hour
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const cacheEntry = userTokenCache[token];
        if (cacheEntry) {
            const lastAccessTime = cacheEntry[1];
            if (now - lastAccessTime > 60 * 60) {
                delete userTokenCache[token];
            }   
        }
    }
}, 1000 * 60 * 60);

let ready = Promise.withResolvers();

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

    loadTestData();

    ready.resolve(true);
}

async function getUserOffers(id) {
    await ready.promise;
    return offers.find({ creator: id });
}

async function getUserRequests(id) {
    await ready.promise;
    return requests.find({ creator: id });
}

async function updateOfferStatus(id, status) {
    await ready.promise;
    return offers.updateOne({ id }, {$set: {
        status: status
    }});
}

async function updateRequestStatus(id, status) {
    await ready.promise;
    return requests.updateOne({ id }, {$set: {
        status: status
    }});
}

async function addOffer(userID, data) {
    await ready.promise;
    return offers.insertOne({
        id: cryptography.uuid(),
        creator: userID,
        pickupLocation: data.pickup_location,
        dropoffLocation: data.dropoff_location,
        pickupTime: data.pickup_time,
        price: data.price,
        // unclaimed passenger seats
        availableSeats: data.total_seats,
        // passenger seat count; driver not included
        totalSeats: data.total_seats,
        usersServing: [],
        // 0=open
        status: OPEN,
        notes: data.notes,
        timestamp: nowSeconds(),
    });
}

async function addRequest(userID, data) {
    await ready.promise;
    return requests.insertOne({
        id: cryptography.uuid(),
        creator: userID,
        pickup_location: data.pickup_location,
        dropoff_location: data.dropoff_location,
        pickup_timerange_start: data.pickup_time,
        pickup_timerange_end: data.dropoff_time,
        price: data.price,
        notes: data.notes,
        // 0=open
        status: OPEN,
        timestamp: nowSeconds(),
    });
}

async function getOpenOffers() {
    await ready.promise;
    return offers
        .aggregate([
            // SELECT FROM offers WHERE status == "open"
            { $match: { status: OPEN } },
            // ORDER BY pickupTime ASC
            { $sort: { pickupTime: 1 } },
            // offers JOIN users ON offers.creator == users.id
            {
                $lookup: {
                    from: "users",
                    localField: "creator",
                    foreignField: "id",
                    as: "creator_info",
                    pipeline: [{ $limit: 1 }],
                }
            },
            // unwrap creator_info from array to object
            { $unwind: "$creator_info" },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    pickup_location: "$pickupLocation",
                    dropoff_location: "$dropoffLocation",
                    pickup_time: "$pickupTime",
                    price: 1,
                    available_seats: "$availableSeats",
                    total_seats: "$totalSeats",
                    notes: 1,
                    creator_name: "$creator_info.name",
                    creator_email: "$creator_info.email"
                }
            }
        ])
        .toArray();
}

async function getOpenRequests(options) {
    await ready.promise;
    if (!options) {
        options = {};
    }

    const fullData = {
        _id: 0,
        id: 1,
        notes: 1,
        pickup_location: 1,
        dropoff_location: 1,
        pickup_timerange_start: 1,
        pickup_timerange_end: 1,
        price: 1,
        creator_name: "$creator_info.name",
        creator_email: "$creator_info.email"
    };

    const nonsensitiveData = {
        _id: 0,
        id: 1,
        pickup_location: 1,
        dropoff_location: 1,
    };

    // consider using strings intstead of integers
    return requests
        .aggregate([
            // SELECT FROM requests WHERE status == "open"
            { $match: { status: OPEN } },
            // ORDER BY pickup_timerange_start DESC
            { $sort: { pickup_timerange_start: 1 } },
            // requests JOIN users ON requests.creator == users.id
            {
                $lookup: {
                    from: "users",
                    localField: "creator",
                    foreignField: "id",
                    as: "creator_info",
                    pipeline: [{ $limit: 1 }],
                }
            },
            // unwrap creator_info from array to object
            { $unwind: "$creator_info" },
            {
                $project: options.authenticated ? fullData : nonsensitiveData
            }
        ])
        .toArray();
}

async function confirmEmail(code) {
    await ready.promise;
    return users.updateOne(
        {  verification_codes: { $all: [code] } },
        {$set: {
            status: 1, 
            verification_codes: []
        }}
    );
}

async function deleteUser(id) {
    await ready.promise;
    return users.deleteOne({ id });
}

async function addUser(data, authToken) {
    await ready.promise;
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

async function removeUserToken(userid, token) {
    await ready.promise;
    delete userTokenCache[token];
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

async function getUserFromEmail(email) {
    await ready.promise;
    return users.findOne({ email });
}

async function getUserFromToken(token) {
    await ready.promise;

    let user = userTokenCache[token];

    if (!user) {
        user = users.findOne({ 
            session_tokens: { $all: [token] }
        });
        userTokenCache[token] = [user, nowSeconds()];
    }

    return user;
}

/*
    checks if email and password are correct
    if credentials are valid, returns a new auth token after saving it to the database
    if credentials are invalid, returns false
*/
async function authenticateUser(email, password) {
    await ready.promise;

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
            return "Error: Password is incorrect";
        }
    }
    return "Error: No user with this email exists";
}

async function removeTestData(){
    await ready.promise;

    await users.deleteMany({
        "id": { $regex: /^!test!/ }
    });
    await requests.deleteMany({
        "id": { $regex: /^!test!/ }
    });
    console.log("TEST DATA REMOVED");
}

async function loadTestData() {
    await ready.promise;
    
    const data = JSON.parse(fs.readFileSync("test-data.json", {elevatedPermissions: true}).toString());
    await removeTestData();
    await users.insertMany(data.users);
    await requests.insertMany(data.requests);
    console.log("TEST DATA LOADED");
}

module.exports = {
    connect,
    addUser,
    deleteUser,
    authenticateUser,
    getUserFromEmail,
    getUserFromToken,
    removeUserToken,
    confirmEmail,
    getOpenRequests,
    addOffer,
    addRequest,
    getOpenOffers
};