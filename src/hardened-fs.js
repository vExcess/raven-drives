/*
    Hopefully our code is completely free from vulnerabilities.
    However, in the case that it's not, as a failsafe I create
    a hardened version of the file system API. With my API, even
    if an attacker gets the ability to try and access arbitrary files,
    my API will block access to all files not explicity whitelisted
    as safe for public access.
*/

const fs = require("node:fs");

// the only valid option is { elevatedPermissions: true }
// yes, it could have been made a simple boolean argument
// but I made it so you must type out the whole "elevatedPermissions"
// so that you are sure you want to be using elevated permissions
function readFileSync(filePath, options) {
    const absProjectPath = path.normalize(process.cwd());

    const absFilePath = path.normalize(path.resolve(filePath));

    // it's late at night, my eyes cannot focus on the text, I'll continue in the morning
}