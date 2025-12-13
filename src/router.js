// HTML templating
const ejs = require('ejs');

// hardened file system
const fs = require("./hardened-fs");

// JSON validator
const Ajv = require("ajv");

const dbIterface = require("./db-interface");

const cryptography = require("./cryptography");

const { nowSeconds, parseJSON, urlFileExt, urlParametersToJson } = require("./utils");

const ajv = new Ajv({ allErrors: false });

const validateUserSignup = ajv.compile({
    type: "object",
    properties: {
        name: { type: "string" }, 
        email: { type: "string" },
        password: { type: "string" }, 
    },
    required: ["name", "email", "password"],
    additionalProperties: false
});

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
        const rendered = await renderPage("index", "Home", data);
        
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
    "/confirmation_sent": async (path, out, data) => {
        const rendered = await renderPage("confirmation_sent", "Check Your Inbox", data);
        
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/invalid_code": async (path, out, data) => {
        const rendered = await renderPage("invalid_code", "Invalid Code", data);
        
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/offer": async (path, out, data) => {
        const rendered = await renderPage("offer", "Offer Ride", data);
        
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/request": async (path, out, data) => {
        const rendered = await renderPage("request", "Request Ride", data);
        
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/confirm_email": async (path, out, data) => {
        const rendered = await renderPage("success", "Green Light", data);
        
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/authenticate?": async (path, out, data) => {
        const rendered = await renderPage("authenticate", "Authenticating", data);
        
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
        let fileType = "text";
        let fileSubType = "plain";

        if (["png", "ico", "svg", "jpg"].includes(fileExt)) fileType = "image";
        if (fileExt === "js") {
            fileSubType = "javascript";
        } else if (fileExt === "svg") {
            fileSubType = "svg+xml";
        } else {
            fileSubType = fileExt;
        }

        // tell client to cache stuff for 1 week in production
        if (!SECRETS.DEV) {
            out.setHeader("Cache-Control", "public, max-age=" + (60 * 60 * 24 * 7));
        }

        let fetchPath = "./src/static/" + path;
        let dataOut = null;

        try {
            dataOut = fs.readFileSync(fetchPath);
        } catch (e) {
            dataOut = null;
        }

        if (dataOut !== null) {
            // send file
            out.writeHead(200, { "Content-Type": `${fileType}/${fileSubType}` });
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
                let json = urlParametersToJson(data.postBody);
                console.log(json);

                let validationErr = null;
                if (!validateUserSignup(json)) {
                    validationErr = JSON.stringify(validateUserSignup.errors);
                }
                
                if (!/^[a-zA-Z0-9\. ]{1,}/.test(json.name)) {
                    validationErr = "invalid name";
                }
                
                if (!/^[a-zA-Z0-9\.]{6,}@(ravens\.benedictine\.edu|benedictine\.edu)/.test(json.email)) {
                    validationErr = "invalid email";
                }

                if (validationErr !== null) {
                    out.writeHead(400);
                    out.write(validationErr);
                    return;
                }

                const authToken = `${nowSeconds()}-${cryptography.uuid()}`;
                console.log(await dbIterface.addUser(json, authToken));

                out.writeHead(302, { "Location": "/authenticate?token="+authToken });
                out.write("Authenticating...");
            },
        }
    }
};

module.exports = {
    routeTree
};