// HTML templating
const ejs = require('ejs');

// hardened file system
const fs = require("./hardened-fs");

const dbIterface = require("./db-interface");

const cryptography = require("./cryptography");

const { nowSeconds, parseJSON, urlFileExt, extMimeType, urlParametersToJson } = require("./utils");

const validator = require("./validator");

const OPEN = 0;
const BANNED = -1;
const UNVERIFIED = 0;
const VERIFIED = 1;

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

const routeTree = {
    "/ping": async (path, out, data) => {
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write("Pong!");
    },
    "/": async (path, out, data) => {
        const rendered = await renderPage("home", "Home", data);
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
    // "/user_view": async (path, out, data) => {
    //     const rendered = await renderPage("user_view", "My Dashboard", data);
        
    //     out.writeHead(200, { 'Content-Type': 'text/html' });
    //     out.write(rendered);
    // },
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

                const user = await dbIterface.getUserFromEmail(json.email);
                const UNVERIFIED = 0;
                if (user && user.email === json.email) {
                    if (user.status === UNVERIFIED) {
                        // delete unverified account
                        await dbIterface.deleteUser(user.id);
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
                console.log(await dbIterface.addUser(json, authToken).catch(err => {
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

                const res = await dbIterface.authenticateUser(json.email, json.password);

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

                const res = await dbIterface.removeUserToken(userData.id, token);
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

                const res = await dbIterface.confirmEmail(code);
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
        },
        ":GET:": {
            "requests": async (path, out, data) => {
                let userData = data["userData"];
                
                let validationErr = null;
                if (!userData || userData.status !== VERIFIED) {
                    validationErr = "Error: Only verified accounts can view requests";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const query = urlParametersToJson(data.url);

                const requests = await dbIterface.getOpenRequests();

                out.writeHead(200, { "Content-Type": "application/json" });
                out.write(JSON.stringify(requests));
            },
        }
    }
};

module.exports = {
    routeTree
};