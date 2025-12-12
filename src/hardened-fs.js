/*
    Hopefully our code is completely free from vulnerabilities.
    However, in the case that it's not, as a failsafe I create
    a hardened version of the file system API. With my API, even
    if an attacker gets the ability to try and access arbitrary files,
    my API will block access to all files not explicity whitelisted
    as safe for public access.
*/

const fs = require("node:fs");
const Path = require("node:path");

// the only valid option is { elevatedPermissions: true }
// yes, it could have been made a simple boolean argument
// but I made it so you must type out the whole "elevatedPermissions"
// so that you are sure you want to be using elevated permissions
function readFileSync(filePath, options) {
    const elevatedPermissions = options?.elevatedPermissions === true ? true : false;

    const absProjectPath = Path.normalize(process.cwd() + "/");

    const absFilePath = Path.normalize(absProjectPath + (filePath));

    const whitelist = [
        "src/static/",
        "src/templates/"
    ];

    if (absFilePath.startsWith(absProjectPath)) {
        let approved = false;
        if (elevatedPermissions) {
            approved = true;
        } else {
            const subFilePath = absFilePath.slice(absProjectPath.length);
            for (const pattern of whitelist) {
                if (subFilePath.startsWith(pattern)) {
                    approved = true;
                    break;
                }
            }
        }
        
        if (approved) {
            if (fs.existsSync(absFilePath)) {
                return fs.readFileSync(absFilePath);
            }
            return null;
        }
        
        throw `Permission denied while reading ${absFilePath}`;
    }

    throw "Refused to read file outside of project directory";
}

module.exports = {
    readFileSync
};