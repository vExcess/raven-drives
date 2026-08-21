// HTML templating
const ejs = require('ejs');

// hardened file system
const fs = require("./hardened-fs");

const dbInterface = require("./db-interface");

const cryptography = require("./cryptography");

const utils = require("./utils");
const { nowSeconds, parseJSON, urlFileExt, extMimeType, urlParametersToJson } = utils;

const validator = require("./validator");

const { OPEN, CLOSED, BANNED, UNVERIFIED, VERIFIED } = dbInterface;

function renderEJS(template, data) {
    return ejs.renderFile(`./src/templates/${template}.ejs`, data);
}

async function renderPage(page, title, data) {
    return renderEJS("base", {
        ...data,
        title: `Raven Drives - ${title}`,
        content: await renderEJS(page, data)
    })
}

let openRequestsCount, openOffersCount, ridesProvidedCount = -1;
async function updateStats() {
    openRequestsCount = (await dbInterface.getRequests({
        query: { open: "true" }
    })).length;
    openOffersCount = (await dbInterface.getOffers({
        query: { open: "true" }
    })).length;
    ridesProvidedCount = await dbInterface.getRidesProvidedCount();
}

// update stats every minute
setInterval(updateStats, 1000 * 60);

const routeTree = {
    "/ping": async (path, out, data) => {
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write("Pong!");
    },
    "/": async (path, out, data) => {
        if (ridesProvidedCount === -1) {
            await updateStats();
        }

        const rendered = await renderPage("home", "Home", {
            ...data,
            openRequestsCount, openOffersCount, ridesProvidedCount
        });
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/login": async (path, out, data) => {
        const rendered = await renderPage("login", "Login", data);
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/signup": async (path, out, data) => {
        const rendered = await renderPage("signup", "Sign Up", data);
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/offer": async (path, out, data) => {
        const rendered = await renderPage("offer", "Offer Ride", data);
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/view_offers": async (path, out, data) => {
        const rendered = await renderPage("view_offers", "Open Offers", data);
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/view_requests": async (path, out, data) => {
        const rendered = await renderPage("view_requests", "Open Requests", data);
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/request": async (path, out, data) => {
        const rendered = await renderPage("request", "Request Ride", data);
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/confirm_email": async (path, out, data) => {
        const rendered = await renderPage("confirm_email", "Email Confirmation", {
            ...data,
            code: urlParametersToJson(data.url)["code"]
        });
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/about": async (path, out, data) => {
        const rendered = await renderPage("about", "About Us", data);

        out.writeHead(200, {'Content-Type': 'text/html'});
        out.write(rendered);
    },
    "/dashboard": async (path, out, data) => {
        let userData = data["userData"];

        if (!userData) {
            out.writeHead(302, { "Location": "/login" });
            out.write("Redirecting...");
            return;
        }

        const offers = await dbInterface.getUserOffers(userData.id);
        const requests = await dbInterface.getUserRequests(userData.id);
        const openOffersCount = offers.filter(offer => offer.status === OPEN).length;
        const openRequestsCount = requests.filter(request => request.status === OPEN).length;

        const rendered = await renderPage("dashboard", "My Dashboard", {
            ...data,
            offers,
            requests,
            openOffersCount,
            openRequestsCount,
            VERIFIED,
            UNVERIFIED,
            utils
        });
        
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/update_offer_status": async (path, out, data) => {
        let userData = data["userData"];

        if (!userData) {
            out.writeHead(302, { "Location": "/login" });
            out.write("Redirecting...");
            return;
        }

        const params = urlParametersToJson(data.url);
        const status = params.status === "open" ? OPEN : params.status === "closed" ? CLOSED : null;

        if (!params.offer_id || status === null) {
            out.writeHead(400);
            out.write("Invalid request");
            return;
        }

        const res = await dbInterface.updateOfferStatus(userData.id, params.offer_id, status);
        if (res.modifiedCount !== 1) {
            out.writeHead(403);
            out.write("Offer not found");
            return;
        }

        out.writeHead(302, { "Location": "/dashboard" });
        out.write("Redirecting...");
    },
    "/update_request_status": async (path, out, data) => {
        let userData = data["userData"];

        if (!userData) {
            out.writeHead(302, { "Location": "/login" });
            out.write("Redirecting...");
            return;
        }

        const params = urlParametersToJson(data.url);
        const status = params.status === "open" ? OPEN : params.status === "closed" ? CLOSED : null;

        if (!params.request_id || status === null) {
            out.writeHead(400);
            out.write("Invalid request");
            return;
        }

        const res = await dbInterface.updateRequestStatus(userData.id, params.request_id, status);
        if (res.modifiedCount !== 1) {
            out.writeHead(403);
            out.write("Request not found");
            return;
        }

        out.writeHead(302, { "Location": "/dashboard" });
        out.write("Redirecting...");
    },
    "/help": async (path, out, data) => {
        const rendered = await renderPage("help", "Help", data);

        out.writeHead(200, {'Content-Type': 'text/html'});
        out.write(rendered);
    },
    "/static/": async (path, out, data) => {
        // stop browsers from complaining about CORS issues
        out.setHeader("Access-Control-Allow-Origin", "*");

        // figure out the type of file
        let fileExt = urlFileExt(path);
        let mimeType = extMimeType(fileExt);

        // tell client to cache stuff for 1 day in production
        if (!SECRETS.DEV) {
            out.setHeader("Cache-Control", "public, max-age=" + (60 * 60 * 24 * 1));
        }

        let dataOut;
        try {
            dataOut = fs.readFileSync("./src/static/" + path);
        } catch (e) {
            dataOut = null;
        }

        if (dataOut !== null) {
            // send file
            out.writeHead(200, { "Content-Type": mimeType });
            out.write(dataOut);
        } else {
            out.writeHead(404);
            out.write("404 Not Found");
        }
    },
    "/API/": {
        ":ACTION": (path, out, data) => {
            // this function is a preprocessor for API calls before the endpoint function is called
        },
        ":POST:": {
            "signup": async (path, out, data) => {
                let json = parseJSON(data.postBody);

                let validationErr = null;
                if (!validator.userSignup(json)) {
                    validationErr = JSON.stringify(validator.userSignup.errors);
                }

                const user = await dbInterface.getUserFromEmail(json.email);
                if (user && user.email === json.email) {
                    if (user.status === UNVERIFIED) {
                        // delete unverified account
                        await dbInterface.deleteUser(user.id);
                    } else {
                        validationErr = "User with that email already exists";
                    }
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const authToken = `${nowSeconds()}-${cryptography.uuid()}`;
                console.log(await dbInterface.addUser(json, authToken).catch(err => {
                    console.log(JSON.stringify(err.errInfo.details, "", "  "))
                }));

                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write(authToken);
            },
            "login": async (path, out, data) => {
                let json = parseJSON(data.postBody);

                let validationErr = null;
                if (!validator.userLogin(json)) {
                    validationErr = JSON.stringify(validator.userLogin.errors);
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.authenticateUser(json.email, json.password);

                // res may be an auth token or an error message
                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write(res);
            },
            "logout": async (path, out, data) => {
                let userData = data["userData"];
                let token = data["userToken"];

                let validationErr = null;
                if (userData === null) {
                    validationErr = "Error: Not logged in";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.removeUserToken(userData.id, token);
                if (res.modifiedCount !== 1) {
                    console.log(`Issue while logging out ${userData.id} ${token}`, res);
                }

                // res may be an auth token or an error message
                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
            "verify_code": async (path, out, data) => {
                let code = data.postBody;

                // already verified
                if (data?.userData?.status === 1) {
                    out.writeHead(200);
                    out.write("OK");
                    return;
                }

                let validationErr = null;
                if (!(typeof code === "string" && code.length > 20 && code.length < 30)) {
                    validationErr = "Error: Bad code";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.confirmEmail(code);
                if (res.modifiedCount !== 1) {
                    validationErr = "Error: Invalid code";
                }

                if (validationErr !== null) {
                    out.writeHead(200);
                    out.write(validationErr);
                    return;
                }

                // res may be an auth token or an error message
                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
            "add_offer": async (path, out, data) => {
                let json = parseJSON(data.postBody);
                let userData = data["userData"];

                let validationErr = null;
                if (!validator.addOffer(json)) {
                    validationErr = JSON.stringify(validator.addOffer.errors);
                } else if (json.dropoff_time < json.pickup_time) {
                    validationErr = JSON.stringify(["dropoff_time must be greater than pickup_time"]);
                }
                if (!userData || userData.status !== VERIFIED) {
                    validationErr = "Error: Only verified accounts can add offers";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.addOffer(userData.id, json);
                if (res.modifiedCount !== 1) {
                    console.log(`Issue while adding offer ${userData.id} ${JSON.stringify(json)}`, res);
                }

                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
            "add_request": async (path, out, data) => {
                let json = parseJSON(data.postBody);
                let userData = data["userData"];

                let validationErr = null;
                if (!validator.addRequest(json)) {
                    validationErr = JSON.stringify(validator.addRequest.errors);
                } else if (json.pickup_timerange_end < json.pickup_timerange_start) {
                    validationErr = JSON.stringify(["pickup_timerange_end must be greater than pickup_timerange_start"]);
                }
                if (!userData || userData.status !== VERIFIED) {
                    validationErr = "Error: Only verified accounts can add requests";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.addRequest(userData.id, json);
                if (res.modifiedCount !== 1) {
                    console.log(`Issue while adding request ${userData.id} ${JSON.stringify(json)}`, res);
                }

                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
            "update_request_price": async (path, out, data) => {
                let json = parseJSON(data.postBody);
                let userData = data["userData"];

                let validationErr = null;
                if (!validator.updateRequestPrice(json)) {
                    validationErr = JSON.stringify(validator.updateRequestPrice.errors);
                }
                if (!userData || userData.status !== VERIFIED) {
                    validationErr = "Error: Only verified accounts can update requests";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.updateRequestPrice(userData.id, json.request_id, json.price);
                if (res.modifiedCount !== 1) {
                    out.writeHead(403);
                    out.write("Error: Request not found");
                    return;
                }

                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
            "update_offer_available_seats": async (path, out, data) => {
                let json = parseJSON(data.postBody);
                let userData = data["userData"];

                let validationErr = null;
                if (!validator.updateOfferAvailableSeats(json)) {
                    validationErr = JSON.stringify(validator.updateOfferAvailableSeats.errors);
                } else if (!Number.isInteger(json.available_seats)) {
                    validationErr = JSON.stringify(["available_seats must be an integer"]);
                }
                if (!userData || userData.status !== VERIFIED) {
                    validationErr = "Error: Only verified accounts can update offers";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.updateOfferAvailableSeats(userData.id, json.offer_id, json.available_seats);
                if (res.error) {
                    out.writeHead(400);
                    out.write(res.error);
                    return;
                }
                if (res.modifiedCount !== 1) {
                    out.writeHead(403);
                    out.write("Error: Offer not found");
                    return;
                }

                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
            "update_offer_notes": async (path, out, data) => {
                let json = parseJSON(data.postBody);
                let userData = data["userData"];

                let validationErr = null;
                if (!validator.updateOfferNotes(json)) {
                    validationErr = JSON.stringify(validator.updateOfferNotes.errors);
                }
                if (!userData || userData.status !== VERIFIED) {
                    validationErr = "Error: Only verified accounts can update offers";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.updateOfferNotes(userData.id, json.offer_id, json.notes);
                if (res.modifiedCount !== 1) {
                    out.writeHead(403);
                    out.write("Error: Offer not found");
                    return;
                }

                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
            "update_request_notes": async (path, out, data) => {
                let json = parseJSON(data.postBody);
                let userData = data["userData"];

                let validationErr = null;
                if (!validator.updateRequestNotes(json)) {
                    validationErr = JSON.stringify(validator.updateRequestNotes.errors);
                }
                if (!userData || userData.status !== VERIFIED) {
                    validationErr = "Error: Only verified accounts can update requests";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const res = await dbInterface.updateRequestNotes(userData.id, json.request_id, json.notes);
                if (res.modifiedCount !== 1) {
                    out.writeHead(403);
                    out.write("Error: Request not found");
                    return;
                }

                out.writeHead(200, { "Content-Type": "text/plain" });
                out.write("OK");
            },
        },
        ":GET:": {
            "requests": async (path, out, data) => {
                let userData = data["userData"];
                const query = urlParametersToJson(data.url);

                let validationErr = null;
                if (!validator.viewRequestsQuery(query)) {
                    validationErr = JSON.stringify(validator.viewRequestsQuery.errors);
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const requests = await dbInterface.getRequests({
                    authenticated: userData && userData.status === VERIFIED,
                    query
                });

                out.writeHead(200, { "Content-Type": "application/json" });
                out.write(JSON.stringify(requests));
            },
            "offers": async (path, out, data) => {
                let userData = data["userData"];
                const query = urlParametersToJson(data.url);

                let validationErr = null;
                if (!validator.viewOffersQuery(query)) {
                    validationErr = JSON.stringify(validator.viewOffersQuery.errors);
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const offers = await dbInterface.getOffers({
                    authenticated: userData && userData.status === VERIFIED,
                    query
                });

                out.writeHead(200, { "Content-Type": "application/json" });
                out.write(JSON.stringify(offers));
            },
        }
    }
};

module.exports = {
    routeTree
};