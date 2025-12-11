const fs = require("./hardened-fs");

/*
    loadSecrets loads the environment from secrets.env
    the secrets are stored in the global SECRETS variable
    SECRETS is capitalized so that we are extra cautious when using this variable

    secrets that are false, true, null, a number, or a string are converted to
    the JS equivelant of such
*/

function loadSecrets() {
    globalThis.SECRETS = {};
    fs.readFileSync("./secrets.env", {elevatedPermissions: true})
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

module.exports = {
    loadSecrets
};