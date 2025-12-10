// file system access

// use HTTP for local development and HTTPS for anything public facing
const http = require("node:http");
const https = require("node:https");

// capitalized so that we are extra cautious when using this variable
let SECRETS = {};
function loadSecrets() {
    fs.readFileSync("./secrets.env")
        .toString()
        .split("\n")
        .map(line => line.trimStart())
        .filter(line => line.length > 0 && line[0] !== "#")
        .map(line => {
            const idx = line.indexOf("=");
            if (idx === -1) {
                console.error("Invalid secrets.env file");
                return null;
            }

            const key = line.slice(0, idx).trim();
            let value = line.slice(idx + 1).trim();

            // parse string values
            if (value.startsWith('"') || value.startsWith("'")) {
                value = JSON.parse(value);
            }
            // handle special keywords
            else if (value === "false") {
                value = false;
            } else if (value === "true") {
                value = true;
            } else if (value === "null") {
                value = null;
            }
            // handle numbers
            else if (!Number.isNaN(Number(value))) {
                value = Number(value);
            }

            return [key, value];
        })
        .filter(pair => pair !== null)
        .forEach(pair => {
            const [key, value] = pair;
            SECRETS[key] = value;
        });
}
loadSecrets();

function requestHandler(request, response) {

}

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

// server.listen(SECRETS.PORT, () => {
//     console.log(`Server online at ${protocol}://127.0.0.1:${SECRETS.PORT}`);
// });


// let ejs = require('ejs');
// let locals = {
//   "pets": [
//     {
//       "name": "Hazel"
//     }
//   , {
//       "name": "Crystal"
//     }
//   , {
//       "name": "Catcher"
//     }
//   ]
// }
// let html = ejs.render(`
//     <ul>
//     <%  pets.forEach(function (pet) { -%>
//     <%- include('included.ejs', {
//             pet: pet
//         }) %>
//     <%  }) -%>
//     </ul>
// `, {pets: locals.pets}, {root: "./src/templates/"});
// console.log(html);

const path = require("node:path");
console.log(path.normalize(process.cwd()));