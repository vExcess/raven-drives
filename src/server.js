// use HTTP for local development and HTTPS for anything public facing
const http = require("node:http");
const https = require("node:https");
const Path = require("node:path");

const dbIterface = require("./db-interface");

const { parseCookies } = require("./utils");

let userCache = {};

function readPostBodyAsString(request) {
    return new Promise((resolve, reject) => {
        let data = "";
        request.on('data', (chunk) => {
            data += chunk;
        });
        request.on('end', () => {
            resolve(data);
        });
        request.on('error', (err) => {
            reject(err);
        });
    });
}

/*
    takes in a request path, router tree, additional data, and the http response
    performs all the routing and response to the http request

    parameters:
        String path,
        Map<String, dynamic> tree,
        Map<String, dynamic> data,
        HttpResponse response

    return:
        int - status code
*/
async function useTree(path, tree, data, response) {
    let status = 404;
    console.log(path);
    try {
        for (const key in tree) {
            // exact match
            if (path.split("?")[0] === key || (key === "/" && path.length === 0)) {
                status = 200;
                await tree[key]("", response, data);
                break;
            } 
            // is on path
            else if (path.startsWith(key) && (key[key.length - 1] === "/" || key[key.length - 1] === "?") && key !== "/") {
                if (key === "/API/") {
                    if (typeof tree[key][":ACTION"] === "function") {
                        await tree[key][":ACTION"](path, response, data);
                    }
                    let request = data["request"];
                    switch (request.method) {
                        case "POST": {
                            data["postBody"] = await readPostBodyAsString(request);
                            status = await useTree(path.slice(key.length), tree[key][":POST:"], data, response);                            
                            break;
                        }
                        case "GET": {
                            status = await useTree(path.slice(key.length), tree[key][":GET:"], data, response);
                            break;
                        }
                    }
                    break;
                } else if (typeof tree[key] === "function") {
                    response.statusCode = status = 200;
                    await tree[key](path.slice(key.length), response, data);
                    break;
                } else {
                    status = await useTree(path.slice(key.length), tree[key], data, response);
                    break;
                }
            }
            // matches wildcard
            else if (key[key.length - 1] === "*" && path.startsWith(key.slice(0, key.length - 1))) {
                status = 200;
                await tree[key](path, response, data);
                break;
            }
            // perform route action
            else if (key === ":ACTION") {
                await tree[key](path, response, data);
            }
        }
    } catch (err) {
        console.error(err);
        status = 500;
        throw err;
    }
    return status;
}

const routeTree = require("./router").routeTree;
async function requestHandler(request, response) {
    let hashedUserIP;
    if (response.req.headers["x-forwarded-for"]) {
        hashedUserIP = SHA256(AES_encrypt(response.req.headers["x-forwarded-for"], secrets.MASTER_KEY));
    }

    const cookies = parseCookies(request.headers.cookie ?? "");

    let userToken = cookies["token"];
    let userData = null;
    
    if (userToken) {
        userData = await dbIterface.getUserFromToken(userToken);
    }

    try {
        // normalize and remove trailing slashes
        let url = Path.posix.normalize(request.url);
        if (url.endsWith("/")) {
            url = url.slice(0, url.length - 1);
        }

        // handle the request
        let requestContext = {
            "request": request,
            "userData": userData,
            "userToken": userToken,
            "hashedUserIP": hashedUserIP,
            "userCache": userCache,
            "url": url
        };
        let status = await useTree(url, routeTree, requestContext, response);
        if (status === 404) {
            response.statusCode = status;
            response.writeHead(status);
            response.write("Not Found");
        }
        if (status === 500) {
            response.writeHead(status);
            response.write("Internal Server Error");
        }
        response.end();
    } catch (err) {
        console.error(request.url);
        console.error(err);
        response.writeHead(500);
        response.write("Internal Server Error");
        response.end();
    }
}

const mailer = require("./mailer");

// If run with Bun we don't need a "main" function, but with NodeJS we do.
(async function main() {
    require("./secrets-loader").loadSecrets();

    await dbIterface.connect();

    mailer.init();

    let server;
    let protocol;
    if (SECRETS.DEV) {
        server = http.createServer(requestHandler);
        protocol = "http";
    } else {
        server = https.createServer({
            key: SECRETS.TLS_KEY,
            cert: SECRETS.TLS_CERT
        }, requestHandler);
        protocol = "https";
    }

    server.listen(SECRETS.PORT, () => {
        console.log(`Server online at ${protocol}://127.0.0.1:${SECRETS.PORT}`);
    });
})().catch(console.error);
